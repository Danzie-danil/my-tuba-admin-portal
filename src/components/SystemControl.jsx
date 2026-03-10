import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

export default function SystemControl() {
    const [maintenanceMode, setMaintenanceMode] = useState(false)
    const [emergencyMessage, setEmergencyMessage] = useState('')
    const [lastSavedMessage, setLastSavedMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null })
    const broadcastChannelRef = useRef(null)
    const broadcastReadyRef = useRef(false)

    useEffect(() => {
        // Broadcast channel to instantly notify connected main-app clients.
        const ch = supabase.channel('public-admin-events')
        broadcastChannelRef.current = ch
        broadcastReadyRef.current = false
        ch.subscribe((status) => {
            if (status === 'SUBSCRIBED') broadcastReadyRef.current = true
        })
        return () => {
            try { supabase.removeChannel(ch) } catch { }
            if (broadcastChannelRef.current === ch) broadcastChannelRef.current = null
            if (broadcastReadyRef.current) broadcastReadyRef.current = false
        }
    }, [])

    // Scroll lock when confirm modal is open
    useEffect(() => {
        if (confirmModal.show) {
            document.body.classList.add('no-scroll');
        } else {
            // Only remove if no other modals are open
            // (Assuming this is the only modal in this component)
            document.body.classList.remove('no-scroll');
        }
        return () => document.body.classList.remove('no-scroll');
    }, [confirmModal.show]);

    const fetchConfig = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('app_config')
            .select('*')

        if (data) {
            const maintenance = data.find(c => c.key === 'maintenance_mode')
            const emergency = data.find(c => c.key === 'emergency_message')
            if (maintenance) setMaintenanceMode(maintenance.value === true)
            if (emergency) {
                const val = emergency.value || ''
                setEmergencyMessage(val)
                setLastSavedMessage(val)
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchConfig()
    }, [])

    const updateConfig = async (key, value) => {
        setIsUpdating(true)
        const { error } = await supabase
            .from('app_config')
            .upsert({
                key,
                value,
                updated_at: new Date().toISOString(),
                updated_by: 'admin'
            })

        if (error) {
            alert('Error updating config: ' + error.message)
        } else {
            // Only track lastSavedMessage for the emergency banner text,
            // not for boolean flags like maintenance_mode.
            if (key === 'emergency_message') {
                const safeValue = typeof value === 'string' ? value : (value ?? '').toString()
                setLastSavedMessage(safeValue)
            }
            // Notify connected clients immediately (no refresh needed).
            try {
                const ch = broadcastChannelRef.current
                if (ch) {
                    // Ensure the channel is fully subscribed before sending.
                    const startedAt = Date.now()
                    while (!broadcastReadyRef.current && Date.now() - startedAt < 3000) {
                        await new Promise(r => setTimeout(r, 50))
                    }
                    await ch.send({
                        type: 'broadcast',
                        event: 'config-updated',
                        payload: { key, value }
                    })
                }
            } catch { }
        }
        setIsUpdating(false)
    }

    const toggleMaintenance = () => {
        const next = !maintenanceMode
        if (next) {
            setConfirmModal({
                show: true,
                title: 'Activate Maintenance Mode',
                message: 'Are you sure? This will block ALL users from accessing the application immediately.',
                onConfirm: () => {
                    setMaintenanceMode(true)
                    updateConfig('maintenance_mode', true)
                    setConfirmModal({ ...confirmModal, show: false })
                }
            })
        } else {
            setMaintenanceMode(false)
            updateConfig('maintenance_mode', false)
        }
    }

    const broadcastTemplates = [
        { label: '🛠️ Scheduled', text: 'Planned maintenance in progress. System will be back shortly.' },
        { label: '💳 Billing', text: 'Billing system is currently being updated. Recent payments may take longer to process.' },
        { label: '⚡ Performance', text: 'We are investigating intermittent system slowness. Thanks for your patience.' },
        { label: '🗄️ Database', text: 'Database optimization in progress. Expect minor interruptions.' },
        { label: '🚨 Emergency', text: 'Technical issues detected. Our team is working to resolve them immediately.' },
    ]

    const handleTemplateSelect = (text) => {
        setEmergencyMessage(text)
    }

    const saveEmergencyMessage = () => {
        updateConfig('emergency_message', emergencyMessage)
    }

    const handleUnpublish = () => {
        setEmergencyMessage('')
        updateConfig('emergency_message', '')
    }

    const isActuallyPublished = lastSavedMessage.trim() !== ''
    const isMessageModified = emergencyMessage !== lastSavedMessage
    const showUnpublish = isActuallyPublished && !isMessageModified

    return (
        <div className="section-container">
            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div className="confirm-modal-overlay" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
                    <div className="confirm-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="confirm-modal-icon">🚨</div>
                        <h3>{confirmModal.title}</h3>
                        <p>{confirmModal.message}</p>
                        <div className="confirm-modal-actions">
                            <button className="btn-confirm-cancel" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
                                Cancel
                            </button>
                            <button className="btn-confirm-danger" onClick={confirmModal.onConfirm}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '8px' }}>
                        <h3>Maintenance Mode</h3>
                        <label className={`ios-toggle ${isUpdating ? 'disabled' : ''}`} style={{ marginRight: '4px' }}>
                            <input
                                type="checkbox"
                                checked={maintenanceMode}
                                onChange={toggleMaintenance}
                                disabled={isUpdating}
                            />
                            <span className="ios-slider">
                                <span className="toggle-on">ON</span>
                                <span className="toggle-off">OFF</span>
                            </span>
                        </label>
                    </div>
                    <p className="stat-value" style={{ color: maintenanceMode ? 'var(--danger)' : 'var(--success)' }}>
                        {maintenanceMode ? 'Active' : 'Standby'}
                    </p>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Application kill switch status.
                    </p>
                </div>

                <div className="stat-card glass-panel">
                    <span className="stat-icon">📣</span>
                    <h3>Broadcast System</h3>
                    <p className="stat-value" style={{ color: '#ff9500' }}>
                        {lastSavedMessage.trim() ? 'Broadcasting' : 'Idle'}
                    </p>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Emergency banner status.
                    </p>
                </div>

                <div className="stat-card glass-panel">
                    <span className="stat-icon">🗄️</span>
                    <h3>Database</h3>
                    <p className="stat-value" style={{ color: 'var(--success)' }}>Stable</p>
                    <p style={{ color: 'var(--text-muted)' }}>Connection status.</p>
                </div>

                <div className="stat-card glass-panel">
                    <span className="stat-icon">🛡️</span>
                    <h3>RLS Policies</h3>
                    <p className="stat-value" style={{ color: 'var(--success)' }}>Active</p>
                    <p style={{ color: 'var(--text-muted)' }}>Internal security.</p>
                </div>

                <div className="stat-card glass-panel">
                    <span className="stat-icon">⚙️</span>
                    <h3>Cron Jobs</h3>
                    <p className="stat-value" style={{ color: 'var(--success)' }}>Running</p>
                    <p style={{ color: 'var(--text-muted)' }}>Background workers.</p>
                </div>
            </div>

            <div className="glass-panel p-24">
                <h2 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Emergency Broadcast</h2>
                <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>
                            Quick Templates
                        </label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {broadcastTemplates.map((template, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleTemplateSelect(template.text)}
                                    style={{
                                        padding: '6px 14px',
                                        fontSize: '12px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '20px',
                                        color: 'white',
                                        fontWeight: 500,
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.1)';
                                        e.target.style.borderColor = 'var(--primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.05)';
                                        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                    }}
                                >
                                    {template.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                            Banner Message (Live editing)
                        </label>
                        <textarea
                            value={emergencyMessage}
                            onChange={(e) => setEmergencyMessage(e.target.value)}
                            placeholder="Select a template or type custom message..."
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                padding: '16px',
                                fontSize: '15px',
                                transition: 'border-color 0.2s'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className={`${showUnpublish ? 'btn-danger' : 'btn-primary'}`}
                            onClick={showUnpublish ? handleUnpublish : saveEmergencyMessage}
                            disabled={isUpdating}
                            style={{
                                minWidth: '120px',
                                background: showUnpublish ? '#ff3b30' : 'var(--primary-gradient)',
                                color: '#ffffff',
                                fontWeight: 'bold',
                                boxShadow: showUnpublish ? '0 8px 16px rgba(255, 59, 48, 0.2)' : '0 8px 16px rgba(88, 86, 214, 0.2)'
                            }}
                        >
                            {isUpdating ? 'Wait...' : (showUnpublish ? 'Unpublish' : 'Publish')}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    )
}
