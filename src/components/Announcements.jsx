import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import CustomSelect from './CustomSelect'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

export default function Announcements() {
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState([])

    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [priority, setPriority] = useState(0)
    const [expiresAt, setExpiresAt] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [isFormExpanded, setIsFormExpanded] = useState(false)

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

        let result;
        if (editingId) {
            result = await supabase
                .from('announcements')
                .update(newAnnouncement)
                .eq('id', editingId)
        } else {
            result = await supabase
                .from('announcements')
                .insert([{ ...newAnnouncement, is_active: true }])
        }

        const { error } = result;

        if (!error) {
            resetForm()
            setIsFormExpanded(false)
            fetchAnnouncements()
            window.dispatchEvent(new Event('announcements-updated'))
        } else {
            console.error('Error saving announcement:', error)
            alert('Failed to save announcement')
        }
        setIsSubmitting(false)
    }

    const resetForm = () => {
        setTitle('')
        setMessage('')
        setPriority(0)
        setExpiresAt('')
        setEditingId(null)
    }

    const handleEdit = (announcement) => {
        setTitle(announcement.title)
        setMessage(announcement.message)
        setPriority(announcement.priority)

        if (announcement.expires_at) {
            // Format for datetime-local: YYYY-MM-DDTHH:MM
            const date = new Date(announcement.expires_at)
            const formattedDate = date.toISOString().slice(0, 16)
            setExpiresAt(formattedDate)
        } else {
            setExpiresAt('')
        }

        setEditingId(announcement.id)
        setIsFormExpanded(true)
        // Scroll to form on mobile
        window.scrollTo({ top: 0, behavior: 'smooth' })
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

    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'align': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ],
    }

    const formats = [
        'bold', 'italic', 'underline', 'strike',
        'align', 'list', 'bullet'
    ]

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
                <div className={`glass-panel p-24 form-collapsible ${isFormExpanded ? 'expanded' : ''}`} style={{ height: 'fit-content' }}>
                    <div
                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                        style={{
                            marginBottom: isFormExpanded ? '16px' : '0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: 0 }}>
                            {editingId ? 'Edit Announcement' : 'New Announcement'}
                        </h3>
                        <span style={{
                            fontSize: '12px',
                            color: 'var(--primary)',
                            fontWeight: 'bold'
                        }}>
                            {isFormExpanded ? 'Close' : 'Create'}
                        </span>
                    </div>

                    <div className="collapsible-content">
                        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
                            <div className="form-group">
                                <label>Title</label>
                                <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. System Maintenance" />
                            </div>
                            <div className="form-group">
                                <label>Message</label>
                                <div className="quill-wrapper">
                                    <ReactQuill
                                        theme="snow"
                                        value={message}
                                        onChange={setMessage}
                                        modules={modules}
                                        formats={formats}
                                        placeholder="Details of the announcement..."
                                    />
                                </div>
                            </div>
                            <div className="form-group row-group">
                                <div style={{ flex: 1 }}>
                                    <label>Priority</label>
                                    <select
                                        className="input-select"
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                    >
                                        <option value="0">Normal (0)</option>
                                        <option value="1">High (1)</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Expires At (Optional)</label>
                                    <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="input-date" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" disabled={isSubmitting} className="btn-success" style={{ flex: 2 }}>
                                    {isSubmitting ? 'Saving...' : editingId ? 'Update Announcement' : 'Publish Announcement'}
                                </button>
                                {editingId && (
                                    <button type="button" onClick={resetForm} className="btn-outline" style={{ flex: 1 }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="glass-panel p-24">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                                Recent Announcements
                            </h3>
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
                                    <div className="item-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', flex: 1, minWidth: '200px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(a.id)}
                                                onChange={() => toggleSelect(a.id)}
                                                style={{ width: '18px', height: '18px', margin: 0, flexShrink: 0 }}
                                            />
                                            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>{a.title} {a.priority > 0 && <span className="badge-high">High</span>}</h4>
                                        </div>
                                        <span className={`status-badge ${a.is_active ? 'active' : 'inactive'}`} style={{ flexShrink: 0 }}>
                                            {a.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div
                                        className="item-msg ql-editor"
                                        style={{ marginBottom: '16px', padding: 0 }}
                                        dangerouslySetInnerHTML={{ __html: a.message }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                        <div className="item-meta" style={{ margin: 0, fontSize: '12px' }}>
                                            <div>Created: {new Date(a.created_at).toLocaleDateString()}</div>
                                            {a.expires_at && <div>Expires: {new Date(a.expires_at).toLocaleDateString()}</div>}
                                        </div>
                                        <div className="item-actions" style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleEdit(a)} className="btn-small">
                                                Edit
                                            </button>
                                            <button onClick={() => toggleStatus(a.id, a.is_active)} className="btn-small">
                                                {a.is_active ? 'Off' : 'On'}
                                            </button>
                                            <button onClick={() => handleDelete(a.id)} className="btn-small btn-danger">
                                                Del
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
