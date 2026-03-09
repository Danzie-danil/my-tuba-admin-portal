import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function UserManagement() {
    const [users, setUsers] = useState([])
    const [unprofiledUsers, setUnprofiledUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [showUnprofiled, setShowUnprofiled] = useState(false)
    const [error, setError] = useState(null)

    const [selectedUser, setSelectedUser] = useState(null)
    const [billingHistory, setBillingHistory] = useState([])
    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false)
    const [billingLoading, setBillingLoading] = useState(false)

    const fetchUsers = async () => {
        setLoading(true)
        setError(null)

        // Fetch profiled users
        const { data: profiledData, error: profiledError } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (profiledData) setUsers(profiledData)
        if (profiledError) {
            console.error('Error fetching users:', profiledError)
            setError(profiledError.message)
        }

        // Fetch unprofiled users via RPC
        const { data: unprofiledData, error: unprofiledError } = await supabase
            .rpc('get_unprofiled_users')

        if (unprofiledData) setUnprofiledUsers(unprofiledData)

        setLoading(false)
    }

    const fetchBillingHistory = async (userId) => {
        setBillingLoading(true)
        const { data, error } = await supabase
            .from('billing_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (!error) setBillingHistory(data || [])
        setBillingLoading(false)
    }

    const openBillingModal = async (user) => {
        let targetUser = user;

        // If user is from unprofiled list (has 'id' instead of 'user_id'), initialize profile first
        if (!user.user_id && user.id) {
            setIsUpdating(true);
            const { data, error } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: user.id,
                    email: user.email,
                    is_paid: false,
                    trial_start: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                alert('Failed to initialize profile: ' + error.message);
                setIsUpdating(false);
                return;
            }

            targetUser = data;
            fetchUsers(); // Refresh the lists
            setIsUpdating(false);
        }

        setSelectedUser(targetUser);
        fetchBillingHistory(targetUser.user_id);
        setIsBillingModalOpen(true);
    }

    const updateBillingField = async (field, value) => {
        if (!selectedUser) return
        setIsUpdating(true)

        const { error } = await supabase
            .from('user_profiles')
            .update({ [field]: value })
            .eq('user_id', selectedUser.user_id)

        if (!error) {
            setSelectedUser({ ...selectedUser, [field]: value })
            fetchUsers()
        }
        setIsUpdating(false)
    }

    const manualAction = async (type, plan = 'one_time') => {
        if (!selectedUser) return
        const notes = window.prompt(`Enter notes for this ${type} action:`, `Manual ${type} by admin`)
        if (notes === null) return

        setIsUpdating(true)
        const now = new Date().toISOString()

        let profileUpdate = {}
        let historyStatus = 'completed'

        if (type === 'activate') {
            profileUpdate = {
                is_paid: true,
                plan_type: plan,
                paid_at: now,
                subscription_status: plan === 'one_time' ? null : 'active'
            }
            if (plan !== 'one_time') {
                const days = plan === 'monthly' ? 30 : (plan === 'biannual' ? 183 : 365)
                profileUpdate.subscription_next_billing = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
            }
        } else if (type === 'revoke') {
            profileUpdate = {
                is_paid: false,
                subscription_status: 'revoked',
                subscription_next_billing: null
            }
            historyStatus = 'revoked'
        }

        // 1. Update Profile
        const { error: pError } = await supabase
            .from('user_profiles')
            .update(profileUpdate)
            .eq('user_id', selectedUser.user_id)

        if (pError) {
            alert('Failed to update profile: ' + pError.message)
            setIsUpdating(false)
            return
        }

        // 2. Log History
        await supabase.from('billing_history').insert({
            user_id: selectedUser.user_id,
            plan_type: plan,
            amount: 0,
            status: historyStatus,
            type: type === 'activate' ? 'manual_activation' : 'revoke',
            notes: notes
        })

        setSelectedUser({ ...selectedUser, ...profileUpdate })
        fetchUsers()
        fetchBillingHistory(selectedUser.user_id)
        setIsUpdating(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleSearch = (e) => {
        setSearchTerm(e.target.value)
    }

    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredUnprofiled = unprofiledUsers.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const extendTrial = async (userId, currentTrialStart) => {
        setIsUpdating(true)
        // Add 48 hours to trial_start OR set to NOW if null
        const baseDate = currentTrialStart ? new Date(currentTrialStart) : new Date()
        const newTrialStart = new Date(baseDate.getTime() + (48 * 60 * 60 * 1000)).toISOString()

        const { error } = await supabase
            .from('user_profiles')
            .update({ trial_start: newTrialStart, subscription_status: null, is_paid: false })
            .eq('user_id', userId)

        if (!error) fetchUsers()
        setIsUpdating(false)
    }

    const resetTrial = async (userId) => {
        if (!window.confirm('Reset this user to a fresh 48h trial?')) return
        setIsUpdating(true)
        const { error } = await supabase
            .from('user_profiles')
            .update({
                trial_start: new Date().toISOString(),
                is_paid: false,
                plan_type: null,
                subscription_status: null,
                subscription_next_billing: null
            })
            .eq('user_id', userId)

        if (!error) fetchUsers()
        setIsUpdating(false)
    }

    const togglePaid = async (userId, currentPaid) => {
        setIsUpdating(true)
        const { error } = await supabase
            .from('user_profiles')
            .update({ is_paid: !currentPaid, subscription_status: !currentPaid ? 'active' : 'expired' })
            .eq('user_id', userId)

        if (!error) fetchUsers()
        setIsUpdating(false)
    }

    const initializeProfile = async (userId, email) => {
        setIsUpdating(true)
        const { error } = await supabase
            .from('user_profiles')
            .insert({
                user_id: userId,
                email: email,
                is_paid: false,
                trial_start: new Date().toISOString()
            })

        if (!error) {
            fetchUsers()
            // If we are showing unprofiled and the list becomes empty, maybe switch back
        } else {
            alert('Failed to initialize profile: ' + error.message)
        }
        setIsUpdating(false)
    }

    return (
        <div className="section-container">
            <div className="glass-panel p-24">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '8px' }}>
                            <div className="tab-group">
                                <div
                                    className={`tab-item ${!showUnprofiled ? 'active' : ''}`}
                                    onClick={() => setShowUnprofiled(false)}
                                >
                                    Subscriptions
                                </div>
                                <div
                                    className={`tab-item ${showUnprofiled ? 'active' : ''}`}
                                    onClick={() => setShowUnprofiled(true)}
                                >
                                    Incomplete ({unprofiledUsers.length})
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                        <input
                            type="text"
                            placeholder="Search by email..."
                            value={searchTerm}
                            onChange={handleSearch}
                            style={{ paddingRight: '40px' }}
                        />
                        <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff453a', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                        <strong>Fetch Error:</strong> {error}
                    </div>
                )}

                {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading users...</p> : (
                    <>
                        {/* Desktop Table View */}
                        <div className="table-responsive hidden-mobile">
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 16px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        <th style={{ padding: '0 16px' }}>User</th>
                                        {!showUnprofiled && <th style={{ padding: '0 16px' }}>Plan & Status</th>}
                                        <th style={{ padding: '0 16px' }}>{showUnprofiled ? 'Registered At' : 'Trial Info'}</th>
                                        <th style={{ padding: '0 16px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(showUnprofiled ? filteredUnprofiled : filteredUsers).map(user => (
                                        <tr key={user.user_id || user.id} className="list-item" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                            <td style={{ padding: '20px 16px', borderRadius: '16px 0 0 16px' }}>
                                                <div style={{ fontWeight: 600, fontSize: '15px' }}>{user.email}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>ID: {(user.user_id || user.id).substring(0, 8)}...</div>
                                            </td>
                                            {!showUnprofiled && (
                                                <td style={{ padding: '20px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span className={`status-badge ${user.is_paid ? 'active' : 'inactive'}`}>
                                                            {user.is_paid ? (user.plan_type || 'Paid') : 'Free/Trial'}
                                                        </span>
                                                        {user.subscription_status && (
                                                            <span style={{ fontSize: '11px', opacity: 0.7 }}>{user.subscription_status}</span>
                                                        )}
                                                    </div>
                                                    {user.subscription_next_billing && (
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                                            Next: {new Date(user.subscription_next_billing).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                            <td style={{ padding: '20px 16px' }}>
                                                {showUnprofiled ? (
                                                    <>
                                                        <div style={{ fontSize: '14px' }}>{new Date(user.created_at).toLocaleDateString()}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            Last Sign-in: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div style={{ fontSize: '14px' }}>
                                                            Started: {user.trial_start ? new Date(user.trial_start).toLocaleDateString() : 'N/A'}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            {user.trial_start ? (
                                                                Math.max(0, 48 - Math.floor((new Date() - new Date(user.trial_start)) / (1000 * 60 * 60))) + 'h remaining'
                                                            ) : 'Trial not started'}
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                            <td style={{ padding: '20px 16px', borderRadius: '0 16px 16px 0', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                    {showUnprofiled ? (
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                className="btn-small btn-success-subtle"
                                                                onClick={() => openBillingModal(user)}
                                                                disabled={isUpdating}
                                                                title="Initialize profile and manage billing"
                                                            >
                                                                Billing
                                                            </button>
                                                            <button
                                                                className="btn-small btn-success-subtle"
                                                                onClick={() => initializeProfile(user.id, user.email)}
                                                                disabled={isUpdating}
                                                                style={{ width: '100px' }}
                                                            >
                                                                Init Profile
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="btn-small btn-success-subtle"
                                                                onClick={() => openBillingModal(user)}
                                                                disabled={isUpdating}
                                                                title="Advanced Billing Management"
                                                            >
                                                                Billing
                                                            </button>
                                                            <button
                                                                className="btn-small"
                                                                onClick={() => extendTrial(user.user_id, user.trial_start)}
                                                                disabled={isUpdating}
                                                                title="Add 48 hours to trial start"
                                                            >
                                                                +48h
                                                            </button>
                                                            <button
                                                                className={`btn-small ${user.is_paid ? 'btn-danger' : 'btn-success'}`}
                                                                onClick={() => togglePaid(user.user_id, user.is_paid)}
                                                                disabled={isUpdating}
                                                                style={{ minWidth: '80px' }}
                                                            >
                                                                {user.is_paid ? 'Revoke' : 'Active'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List View */}
                        <div className="mobile-card-list mobile-only">
                            {(showUnprofiled ? filteredUnprofiled : filteredUsers).map(user => (
                                <div key={user.user_id || user.id} className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>{user.email}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {(user.user_id || user.id).substring(0, 12)}...</div>
                                    </div>

                                    {!showUnprofiled && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Plan & Status</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                    <span className={`status-badge ${user.is_paid ? 'active' : 'inactive'}`} style={{ padding: '2px 8px' }}>
                                                        {user.is_paid ? (user.plan_type || 'Paid') : 'Free/Trial'}
                                                    </span>
                                                    {user.subscription_status && <span style={{ fontSize: '11px', opacity: 0.7 }}>{user.subscription_status}</span>}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trial Progress</div>
                                                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                                                    {user.trial_start ? Math.max(0, 48 - Math.floor((new Date() - new Date(user.trial_start)) / (1000 * 60 * 60))) + 'h left' : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {showUnprofiled && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registered At</div>
                                                <div style={{ fontSize: '13px', marginTop: '4px' }}>{new Date(user.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Last Sign-in</div>
                                                <div style={{ fontSize: '13px', marginTop: '4px' }}>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}</div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {showUnprofiled ? (
                                            <>
                                                <button className="btn-small btn-success-subtle" style={{ flex: 1 }} onClick={() => openBillingModal(user)}>Billing</button>
                                                <button className="btn-small btn-success-subtle" style={{ flex: 1 }} onClick={() => initializeProfile(user.id, user.email)}>Init Profile</button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="btn-small btn-success-subtle" style={{ flex: 1 }} onClick={() => openBillingModal(user)}>Billing</button>
                                                <button className="btn-small" style={{ flex: 1 }} onClick={() => extendTrial(user.user_id, user.trial_start)}>+48h</button>
                                                <button className={`btn-small ${user.is_paid ? 'btn-danger' : 'btn-success'}`} style={{ flex: 1 }} onClick={() => togglePaid(user.user_id, user.is_paid)}>
                                                    {user.is_paid ? 'Revoke' : 'Active'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {(showUnprofiled ? filteredUnprofiled : filteredUsers).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                No users found matching "{searchTerm}"
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Billing Modal */}
            {isBillingModalOpen && selectedUser && (
                <div className="modal-overlay" onClick={() => setIsBillingModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
                        <button className="modal-close" onClick={() => setIsBillingModalOpen(false)}>×</button>
                        <div className="modal-title" style={{ fontSize: '20px', marginBottom: '4px' }}>Billing Management</div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                            Managing billing for <strong>{selectedUser.email}</strong>
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                            <div className="glass-panel" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Current Plan</div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{selectedUser.plan_type || 'Free/Trial'}</div>
                                <div style={{ fontSize: '11px', color: selectedUser.is_paid ? '#34c759' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedUser.is_paid ? '#34c759' : 'currentColor' }}></span>
                                    {selectedUser.is_paid ? 'Active' : 'Inactive'}
                                </div>
                            </div>
                            <div className="glass-panel" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Next Billing</div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="date"
                                        className="premium-date-input"
                                        value={selectedUser.subscription_next_billing ? selectedUser.subscription_next_billing.split('T')[0] : ''}
                                        onChange={(e) => updateBillingField('subscription_next_billing', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                    />
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)' }}></span>
                                    Billing Cycle
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '12px' }}>Manual Actions</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button className="btn-small btn-success" style={{ height: '36px', padding: '0 16px' }} onClick={() => manualAction('activate', 'one_time')}>Activate Lifetime</button>
                                <button className="btn-small btn-success" style={{ height: '36px', padding: '0 16px' }} onClick={() => manualAction('activate', 'monthly')}>Activate Monthly</button>
                                <button className="btn-small btn-danger" style={{ height: '36px', padding: '0 16px' }} onClick={() => manualAction('revoke')}>Revoke Access</button>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Billing History</span>
                                {billingLoading && <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.6 }}>Loading...</span>}
                            </div>
                            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
                                {billingHistory.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', opacity: 0.4, fontSize: '12px' }}>No history records found.</div>
                                ) : (
                                    billingHistory.map(entry => (
                                        <div key={entry.id} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 600 }}>{entry.type.replace('_', ' ').toUpperCase()}</span>
                                                <span style={{ fontSize: '10px', opacity: 0.5 }}>{new Date(entry.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div style={{ fontSize: '11px', opacity: 0.7 }}>Plan: {entry.plan_type} | Status: {entry.status}</div>
                                            {entry.notes && <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>"{entry.notes}"</div>}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', textAlign: 'right' }}>
                            <button className="btn-secondary" style={{ height: '36px', fontSize: '13px' }} onClick={() => setIsBillingModalOpen(false)}>Close Window</button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .premium-date-input {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 10px;
                    font-size: 13px;
                    width: 100%;
                    outline: none;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .premium-date-input:focus {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px rgba(88, 86, 214, 0.1);
                }
                .premium-date-input::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    opacity: 0.5;
                    cursor: pointer;
                }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s ease;
                }
                .modal-content {
                    background: radial-gradient(circle at 50% 0%, #1c1c1e 0%, #000000 100%) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 28px;
                    padding: 32px;
                    position: relative;
                    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6);
                }
                .modal-close {
                    position: absolute;
                    top: 24px;
                    right: 24px;
                    background: rgba(255,255,255,0.05);
                    border: none;
                    color: #fff;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }
                .modal-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 8px;
                }
                .btn-success-subtle {
                    background: rgba(52, 199, 89, 0.1);
                    color: #34c759;
                    border: 1px solid rgba(52, 199, 89, 0.2);
                }
                .btn-success-subtle:hover {
                    background: rgba(52, 199, 89, 0.2);
                }
                table tr.list-item:hover {
                    background: rgba(255,255,255,0.05) !important;
                    transform: scale(1.005);
                    transition: all 0.2s ease;
                }
                .status-badge.active { background: rgba(52, 199, 89, 0.15); color: #34c759; }
                .status-badge.inactive { background: rgba(255, 255, 255, 0.08); color: rgba(255,255,255,0.5); }
            `}} />
        </div>
    )
}
