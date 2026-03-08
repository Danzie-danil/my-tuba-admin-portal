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
        if (unprofiledError) {
            console.error('Error fetching unprofiled users:', unprofiledError)
            // Don't set global error if only RPC fails (might be permission issue during dev)
        }

        setLoading(false)
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
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px' }}>
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
                                                    <button
                                                        className="btn-small btn-success-subtle"
                                                        onClick={() => initializeProfile(user.id, user.email)}
                                                        disabled={isUpdating}
                                                        style={{ width: '120px' }}
                                                    >
                                                        Init Profile
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn-small"
                                                            onClick={() => extendTrial(user.user_id, user.trial_start)}
                                                            disabled={isUpdating}
                                                            title="Add 48 hours to trial start"
                                                        >
                                                            +48h
                                                        </button>
                                                        <button
                                                            className="btn-small"
                                                            onClick={() => resetTrial(user.user_id)}
                                                            disabled={isUpdating}
                                                            title="Reset to fresh 48h trial"
                                                        >
                                                            Reset
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
                        {filteredUsers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                No users found matching "{searchTerm}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
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
