import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function SecurityLogs() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [eventTypeFilter, setEventTypeFilter] = useState('all') // 'all', 'login', 'failed_login', etc.

    const fetchLogs = async () => {
        setLoading(true)
        let query = supabase
            .from('access_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

        if (eventTypeFilter !== 'all') {
            query = query.eq('event_type', eventTypeFilter)
        }

        const { data, error } = await query

        if (data) setLogs(data)
        if (error) console.error('Error fetching logs:', error)

        setLoading(false)
    }

    useEffect(() => {
        fetchLogs()
    }, [eventTypeFilter])

    const filteredLogs = logs.filter(log =>
        log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Calculate quick stats
    const today = new Date().toISOString().split('T')[0]
    const loginsToday = logs.filter(l => l.event_type === 'login' && l.created_at.startsWith(today)).length
    const failuresTotal = logs.filter(l => l.event_type === 'failed_login').length

    return (
        <div className="section-container">
            {/* KPI Cards */}
            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                <div className="stat-card glass-panel">
                    <span className="stat-icon">🔐</span>
                    <h3>Logins Today</h3>
                    <p className="stat-value" style={{ color: 'var(--success)' }}>{loginsToday}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Successful authentications today.
                    </p>
                </div>

                <div className="stat-card glass-panel">
                    <span className="stat-icon">⚠️</span>
                    <h3>Recent Failures</h3>
                    <p className="stat-value" style={{ color: failuresTotal > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{failuresTotal}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Total failed login attempts tracked.
                    </p>
                </div>
            </div>

            {/* Logs List */}
            <div className="glass-panel p-24">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                            System Audit
                        </h3>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>Access Logs</h2>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <select
                            className="input-select"
                            style={{ width: 'auto', minWidth: '150px', padding: '10px 16px', height: '42px' }}
                            value={eventTypeFilter}
                            onChange={(e) => setEventTypeFilter(e.target.value)}
                        >
                            <option value="all">All Events</option>
                            <option value="login">Logins</option>
                            <option value="failed_login">Failed Logins</option>
                            <option value="policy_update">Policy Updates</option>
                            <option value="admin_action">Admin Actions</option>
                        </select>

                        <div style={{ position: 'relative', width: '250px' }}>
                            <input
                                type="text"
                                placeholder="Search email or IP..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingRight: '40px', height: '42px', padding: '10px 16px' }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                        </div>
                    </div>
                </div>

                {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading audit logs...</p> : (
                    <div className="list-container">
                        {filteredLogs.map(log => (
                            <div key={log.id} className="list-item" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span className={`status-badge ${log.event_type === 'login' ? 'active' : log.event_type === 'failed_login' ? '' : 'inactive'}`}
                                            style={{
                                                background: log.event_type === 'failed_login' ? 'rgba(255, 59, 48, 0.15)' : undefined,
                                                color: log.event_type === 'failed_login' ? '#ff453a' : undefined,
                                                minWidth: '100px',
                                                textAlign: 'center'
                                            }}>
                                            {log.event_type.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{log.email || 'System User'}</span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {new Date(log.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                                        {log.description || 'No additional details.'}
                                    </span>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                                        <span>IP: {log.ip_address || 'Unknown'}</span>
                                        <span style={{ fontFamily: 'monospace', opacity: 0.5 }}>ID: {log.id.split('-')[0]}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredLogs.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>No logs found matching your criteria.</p>
                        )}
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .list-item { transition: background 0.2s ease; }
                .list-item:hover { background: rgba(255,255,255,0.04) !important; }
            `}} />
        </div>
    )
}
