import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CustomSelect from './CustomSelect'

export default function SupportTickets() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all') // 'all', 'open', 'in_progress', 'resolved'
    const [replyDrafts, setReplyDrafts] = useState({})

    const fetchTickets = async () => {
        setLoading(true)
        let query = supabase
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false })

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter)
        }

        const { data, error } = await query

        if (data) setTickets(data)
        if (error) console.error('Error fetching support tickets:', error)

        setLoading(false)
    }

    useEffect(() => {
        fetchTickets()
    }, [statusFilter])

    const updateTicketStatus = async (id, newStatus) => {
        const updates = {
            status: newStatus,
            updated_at: new Date().toISOString()
        }
        if (newStatus === 'resolved') {
            updates.resolved_at = new Date().toISOString()
        }

        const { error } = await supabase
            .from('support_tickets')
            .update(updates)
            .eq('id', id)

        if (!error) {
            // Update local state instead of full re-fetch
            setTickets(tickets.map(t => t.id === id ? { ...t, ...updates } : t))
        } else {
            console.error('Error updating status:', error)
            alert('Failed to update ticket status.')
        }
    }

    const submitReply = async (id) => {
        const replyText = replyDrafts[id]?.trim()
        if (!replyText) return

        const updates = {
            admin_reply: replyText,
            admin_reply_at: new Date().toISOString(),
            status: 'resolved',
            updated_at: new Date().toISOString(),
            resolved_at: new Date().toISOString()
        }

        const { error } = await supabase
            .from('support_tickets')
            .update(updates)
            .eq('id', id)

        if (!error) {
            setTickets(tickets.map(t => t.id === id ? { ...t, ...updates } : t))
            setReplyDrafts(prev => ({ ...prev, [id]: '' }))
        } else {
            console.error('Error sending reply:', error)
            alert('Failed to send reply.')
        }
    }

    const filteredTickets = tickets.filter(ticket =>
        (ticket.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ticket.subject?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ticket.message?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )

    // Calculate quick stats
    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
    const resolvedTotal = tickets.filter(t => t.status === 'resolved').length

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return '#ff9500' // Warning / Orange
            case 'in_progress': return '#34c759' // Greenish
            case 'resolved': return '#8e8e93' // Gray
            default: return 'var(--text-muted)'
        }
    }

    return (
        <div className="section-container">
            {/* KPI Cards */}
            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                <div className="stat-card glass-panel">
                    <span className="stat-icon">📥</span>
                    <h3>Pending Tickets</h3>
                    <p className="stat-value" style={{ color: openTickets > 0 ? '#ff9500' : 'var(--text-muted)' }}>{openTickets}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Tickets needing your attention.
                    </p>
                </div>

                <div className="stat-card glass-panel">
                    <span className="stat-icon">✅</span>
                    <h3>Resolved</h3>
                    <p className="stat-value" style={{ color: 'var(--text-muted)' }}>{resolvedTotal}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Total resolved issues.
                    </p>
                </div>
            </div>

            {/* Tickets List */}
            <div className="glass-panel p-24">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                            User Support
                        </h3>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>Feedback & Issues</h2>
                    </div>

                    <div className="header-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: 'none' }}>
                        <CustomSelect
                            className="input-select"
                            style={{ flex: '1 1 150px', height: '42px' }}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Tickets' },
                                { value: 'open', label: 'Open' },
                                { value: 'in_progress', label: 'In Progress' },
                                { value: 'resolved', label: 'Resolved' }
                            ]}
                        />

                        <div style={{ position: 'relative', flex: '1 1 250px' }}>
                            <input
                                type="text"
                                placeholder="Search email, subject, body..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingRight: '40px', height: '42px', padding: '10px 16px', width: '100%' }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                        </div>
                    </div>
                </div>

                {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading support tickets...</p> : (
                    <div className="list-container">
                        {filteredTickets.map(ticket => (
                            <div key={ticket.id} className="list-item" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: `4px solid ${getStatusColor(ticket.status)}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '16px' }}>{ticket.subject || 'No Subject'}</span>
                                            <span className="status-badge" style={{
                                                background: `rgba(${ticket.status === 'open' ? '255,149,0' : ticket.status === 'in_progress' ? '52,199,89' : '142,142,147'}, 0.15)`,
                                                color: getStatusColor(ticket.status),
                                                fontSize: '11px',
                                                padding: '4px 8px'
                                            }}>
                                                {ticket.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            From: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{ticket.email}</span>
                                            {ticket.user_id && <span style={{ opacity: 0.5 }}> (Auth User)</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {new Date(ticket.created_at).toLocaleString()}
                                        </span>

                                        <select
                                            className="input-select"
                                            style={{ width: '130px', padding: '4px 8px', fontSize: '12px', height: 'auto' }}
                                            value={ticket.status}
                                            onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                                        >
                                            <option value="open">Mark Open</option>
                                            <option value="in_progress">Mark In Progress</option>
                                            <option value="resolved">Mark Resolved</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {ticket.message}
                                </div>
                                {ticket.admin_reply ? (
                                    <div style={{ background: 'rgba(102, 126, 234, 0.1)', borderLeft: '4px solid var(--primary)', padding: '16px', borderRadius: '0 8px 8px 0', marginTop: '8px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>Admin Response ({new Date(ticket.admin_reply_at).toLocaleString()})</div>
                                        <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{ticket.admin_reply}</div>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '8px' }}>
                                        <textarea
                                            value={replyDrafts[ticket.id] || ''}
                                            onChange={(e) => setReplyDrafts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                            placeholder="Write a response to the user..."
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', minHeight: '80px', marginBottom: '8px', outline: 'none', resize: 'vertical' }}
                                        ></textarea>
                                        <button
                                            className="btn-success btn-small"
                                            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                            onClick={() => submitReply(ticket.id)}
                                            disabled={!replyDrafts[ticket.id]?.trim()}
                                        >
                                            Send Response & Resolve
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
                }
                {
                    !loading && filteredTickets.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>No tickets found matching your criteria.</p>
                    )
                }
            </div >

            <style dangerouslySetInnerHTML={{
                __html: `
                .list-item { transition: background 0.2s ease; }
                .list-item:hover { background: rgba(255,255,255,0.04) !important; }
                .input-select { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 8px; }
            `}} />
        </div >
    )
}
