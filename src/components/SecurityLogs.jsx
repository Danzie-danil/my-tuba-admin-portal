import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CustomSelect from './CustomSelect'

export default function SecurityLogs() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [eventTypeFilter, setEventTypeFilter] = useState('all') // 'all', 'login', 'failed_login', etc.
    const [selectedLog, setSelectedLog] = useState(null)

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
            <div className="stats-grid">
                <div className="stat-card glass-panel">
                    <span className="stat-icon">🔐</span>
                    <h3>Logins Today</h3>
                    <p className="stat-value" style={{ color: 'var(--success)' }}>{loginsToday}</p>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Successful authentications today.
                    </p>
                </div>

                <div className="stat-card glass-panel">
                    <span className="stat-icon">⚠️</span>
                    <h3>Recent Failures</h3>
                    <p className="stat-value" style={{ color: failuresTotal > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{failuresTotal}</p>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Total failed login attempts tracked.
                    </p>
                </div>
            </div>

            {/* Logs List */}
            <div className="glass-panel p-24">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                            System Audit Logs
                        </h3>
                    </div>

                    <div className="header-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: 'none' }}>
                        <select
                            className="input-select"
                            style={{ flex: '1 1 150px', height: '42px' }}
                            value={eventTypeFilter}
                            onChange={(e) => setEventTypeFilter(e.target.value)}
                        >
                            <option value="all">All Events</option>
                            <option value="login">Logins</option>
                            <option value="failed_login">Failed Logins</option>
                            <option value="policy_update">Policy Updates</option>
                            <option value="admin_action">Admin Actions</option>
                        </select>

                        <div style={{ position: 'relative', flex: '1 1 250px' }}>
                            <input
                                type="text"
                                placeholder="Search email or IP..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingRight: '40px', height: '42px', padding: '10px 16px', width: '100%' }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                        </div>
                    </div>
                </div>

                {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading audit logs...</p> : (
                    <div className="list-container">
                        {filteredLogs.map(log => (
                            <div
                                key={log.id}
                                className="list-item"
                                style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                                onClick={() => setSelectedLog(log)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                        <span className={`status-badge ${log.event_type === 'login' ? 'active' : log.event_type === 'failed_login' ? '' : 'inactive'}`}
                                            style={{
                                                background: log.event_type === 'failed_login' ? 'rgba(255, 59, 48, 0.15)' : undefined,
                                                color: log.event_type === 'failed_login' ? '#ff453a' : undefined,
                                                minWidth: '90px',
                                                textAlign: 'center',
                                                fontSize: '11px'
                                            }}>
                                            {log.event_type.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <span style={{ fontWeight: 600, fontSize: '14px', wordBreak: 'break-all', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }} title={log.email}>
                                            {log.email || 'System User'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {new Date(log.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', flex: 1, minWidth: '200px' }}>
                                        {log.description || 'No additional details.'}
                                    </span>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '12px', opacity: 0.8 }}>
                                        <span>IP: {log.ip_address || 'Unknown'}</span>
                                        <span style={{ fontFamily: 'monospace', opacity: 0.6 }}>ID: {log.id.split('-')[0]}</span>
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

            {/* Log Detail Modal */}
            {selectedLog && (
                <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Log Resource Details</h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', opacity: 0.6 }}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
                                <span className={`status-badge ${selectedLog.event_type === 'login' ? 'active' : selectedLog.event_type === 'failed_login' ? '' : 'inactive'}`}
                                    style={{
                                        background: selectedLog.event_type === 'failed_login' ? 'rgba(255, 59, 48, 0.15)' : undefined,
                                        color: selectedLog.event_type === 'failed_login' ? '#ff453a' : undefined,
                                        minWidth: '100px',
                                        textAlign: 'center'
                                    }}>
                                    {selectedLog.event_type.replace('_', ' ').toUpperCase()}
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {new Date(selectedLog.created_at).toLocaleString()}
                                </span>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">User Email</span>
                                <span className="detail-value" style={{ fontWeight: 600, color: 'var(--primary)' }}>{selectedLog.email || 'System User'}</span>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">Event Description</span>
                                <span className="detail-value" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {selectedLog.description || 'No additional details provided.'}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="detail-row">
                                    <span className="detail-label">IP Address</span>
                                    <span className="detail-value">{selectedLog.ip_address || 'Unknown'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Event ID</span>
                                    <span className="detail-value" style={{ fontFamily: 'monospace', opacity: 0.8 }}>{selectedLog.id}</span>
                                </div>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">Timestamp</span>
                                <span className="detail-value">{selectedLog.created_at}</span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-outline" onClick={() => setSelectedLog(null)} style={{ width: 'auto' }}>Close Details</button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .list-item { transition: background 0.2s ease; }
                .list-item:hover { background: rgba(255,255,255,0.04) !important; }
            `}} />
        </div>
    )
}
