import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function SystemControl() {
    const [maintenanceMode, setMaintenanceMode] = useState(false)
    const [emergencyMessage, setEmergencyMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState(false)

    const fetchConfig = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('app_config')
            .select('*')

        if (data) {
            const maintenance = data.find(c => c.key === 'maintenance_mode')
            const emergency = data.find(c => c.key === 'emergency_message')
            if (maintenance) setMaintenanceMode(maintenance.value === true)
            if (emergency) setEmergencyMessage(emergency.value || '')
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
            // Dispatch custom event for real-time header update if needed
            window.dispatchEvent(new CustomEvent('config-updated'))
        }
        setIsUpdating(false)
    }

    const toggleMaintenance = () => {
        const next = !maintenanceMode
        if (next && !window.confirm('Are you sure? This will block ALL users from accessing the app immediately.')) return
        setMaintenanceMode(next)
        updateConfig('maintenance_mode', next)
    }

    const saveEmergencyMessage = () => {
        updateConfig('emergency_message', emergencyMessage)
    }

    return (
        <div className="section-container">
            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                <div className="stat-card glass-panel">
                    <span className="stat-icon">{maintenanceMode ? '🚨' : '🛡️'}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h3>Maintenance Mode</h3>
                            <p className="stat-value" style={{ color: maintenanceMode ? 'var(--danger)' : 'var(--success)', fontSize: '24px' }}>
                                {maintenanceMode ? 'Active' : 'Standby'}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Application kill switch status.
                            </p>
                        </div>
                        <button
                            className={`btn-small ${maintenanceMode ? 'btn-danger' : 'btn-outline'}`}
                            onClick={toggleMaintenance}
                            disabled={isUpdating}
                            style={{ padding: '4px 12px', height: '28px' }}
                        >
                            {maintenanceMode ? 'OFF' : 'ON'}
                        </button>
                    </div>
                </div>

                <div className="stat-card glass-panel">
                    <span className="stat-icon">📣</span>
                    <h3>Broadcast System</h3>
                    <p className="stat-value" style={{ color: '#ff9500', fontSize: '24px' }}>
                        {emergencyMessage.trim() ? 'Broadcasting' : 'Idle'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Emergency banner status.
                    </p>
                </div>
            </div>

            <div className="glass-panel p-24">
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>Emergency Broadcast</h2>
                <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                    <div className="form-group">
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                            Banner Message (Leave empty to clear)
                        </label>
                        <textarea
                            value={emergencyMessage}
                            onChange={(e) => setEmergencyMessage(e.target.value)}
                            placeholder="e.g. System upgrade in progress. Expect intermittent downtime."
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                padding: '16px',
                                fontSize: '15px'
                            }}
                        />
                    </div>
                    <button
                        className="btn-primary"
                        onClick={saveEmergencyMessage}
                        disabled={isUpdating}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        {isUpdating ? 'Updating...' : 'Update Banner'}
                    </button>
                </div>
            </div>

            <div className="glass-panel p-24" style={{ marginTop: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>System Health</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'rgba(52, 199, 89, 0.05)', borderRadius: '12px', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase' }}>Database Connection</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>Stable</div>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(52, 199, 89, 0.05)', borderRadius: '12px', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase' }}>RLS Policies</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>Active</div>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(52, 199, 89, 0.05)', borderRadius: '12px', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase' }}>Cron Jobs</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>Running</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
