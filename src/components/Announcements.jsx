import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Announcements() {
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState([])

    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [priority, setPriority] = useState(0)
    const [expiresAt, setExpiresAt] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const fetchAnnouncements = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setAnnouncements(data)
        if (error) console.error('Error fetching announcements:', error)
        setLoading(false)
        setSelectedIds([]) // Clear selection on refresh
    }

    useEffect(() => {
        fetchAnnouncements()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        const newAnnouncement = {
            title,
            message,
            priority: parseInt(priority, 10),
            is_active: true
        }

        if (expiresAt) {
            newAnnouncement.expires_at = new Date(expiresAt).toISOString()
        }

        const { error } = await supabase
            .from('announcements')
            .insert([newAnnouncement])

        if (!error) {
            setTitle('')
            setMessage('')
            setPriority(0)
            setExpiresAt('')
            fetchAnnouncements()
            window.dispatchEvent(new Event('announcements-updated'))
        } else {
            console.error('Error creating announcement:', error)
            alert('Failed to create announcement')
        }
        setIsSubmitting(false)
    }

    const toggleStatus = async (id, currentStatus) => {
        const { error } = await supabase
            .from('announcements')
            .update({ is_active: !currentStatus })
            .eq('id', id)

        if (!error) {
            fetchAnnouncements()
            window.dispatchEvent(new Event('announcements-updated'))
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return

        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id)

        if (!error) {
            fetchAnnouncements()
            window.dispatchEvent(new Event('announcements-updated'))
        } else {
            console.error('Error deleting:', error)
            alert('Failed to delete announcement')
        }
    }

    // --- Bulk Action Handlers ---
    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === announcements.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(announcements.map(a => a.id))
        }
    }

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} announcements?`)) return
        setIsSubmitting(true)

        const { error } = await supabase
            .from('announcements')
            .delete()
            .in('id', selectedIds)

        if (!error) {
            fetchAnnouncements()
            window.dispatchEvent(new Event('announcements-updated'))
        } else {
            alert('Failed to delete announcements')
        }
        setIsSubmitting(false)
    }

    const handleBulkStatus = async (active) => {
        setIsSubmitting(true)

        const { error } = await supabase
            .from('announcements')
            .update({ is_active: active })
            .in('id', selectedIds)

        if (!error) {
            fetchAnnouncements()
            window.dispatchEvent(new Event('announcements-updated'))
        } else {
            alert('Failed to update announcements')
        }
        setIsSubmitting(false)
    }

    return (
        <div className="section-container">
            <div className="layout-grid">

                {/* Create form */}
                <div className="glass-panel p-24" style={{ height: 'fit-content' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                            Create New
                        </h3>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>Announcement</h2>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Title</label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. System Maintenance" />
                        </div>
                        <div className="form-group">
                            <label>Message</label>
                            <textarea
                                className="input-textarea"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                                rows="4"
                                placeholder="Details of the announcement..."
                            />
                        </div>
                        <div className="form-group row-group">
                            <div style={{ flex: 1 }}>
                                <label>Priority</label>
                                <select className="input-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                                    <option value={0}>Normal (0)</option>
                                    <option value={1}>High (1)</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label>Expires At (Optional)</label>
                                <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="input-date" />
                            </div>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="btn-success">
                            {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="glass-panel p-24">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                Recent
                            </h3>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>Announcements</h2>
                        </div>
                        {!loading && announcements.length > 0 && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '10px 16px', borderRadius: '14px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === announcements.length && announcements.length > 0}
                                    onChange={toggleSelectAll}
                                />
                                Select All
                            </label>
                        )}
                    </div>

                    {/* Bulk Action Bar */}
                    {selectedIds.length > 0 && (
                        <div className="bulk-action-bar">
                            <span style={{ fontWeight: 600, fontSize: '15px' }}>{selectedIds.length} Selected</span>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-small" onClick={() => handleBulkStatus(true)}>Activate</button>
                                <button className="btn-small" onClick={() => handleBulkStatus(false)}>Deactivate</button>
                                <button className="btn-small btn-danger" onClick={handleBulkDelete}>Delete All</button>
                            </div>
                        </div>
                    )}

                    {loading ? <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading...</p> : (
                        <div className="list-container">
                            {announcements.map(a => (
                                <div key={a.id} className={`list-item ${a.is_active ? '' : 'inactive'} ${selectedIds.includes(a.id) ? 'selected' : ''}`} style={{ position: 'relative' }}>
                                    <div className="item-header" style={{ marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', paddingLeft: '32px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(a.id)}
                                                onChange={() => toggleSelect(a.id)}
                                                style={{ position: 'absolute', top: '24px', left: '24px', margin: 0, padding: 0, width: '18px', height: '18px', zIndex: 1 }}
                                            />
                                            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>{a.title} {a.priority > 0 && <span className="badge-high">High Priority</span>}</h4>
                                        </div>
                                        <span className={`status-badge ${a.is_active ? 'active' : 'inactive'}`}>
                                            {a.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <p className="item-msg" style={{ marginBottom: '16px' }}>{a.message}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                        <div className="item-meta" style={{ margin: 0 }}>
                                            <small>Created: {new Date(a.created_at).toLocaleString()}</small>
                                            {a.expires_at && <small> • Expires: {new Date(a.expires_at).toLocaleString()}</small>}
                                        </div>
                                        <div className="item-actions">
                                            <button onClick={() => toggleStatus(a.id, a.is_active)} className="btn-small">
                                                {a.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button onClick={() => handleDelete(a.id)} className="btn-small btn-danger">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {announcements.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>No announcements found.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
