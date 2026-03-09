import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Announcements from './Announcements'
import UserManagement from './UserManagement'
import SystemControl from './SystemControl'
import SecurityLogs from './SecurityLogs'
import PlatformAnalytics from './PlatformAnalytics'
import SupportTickets from './SupportTickets'

export default function Dashboard({ session }) {
    const [activeAnnouncementsCount, setActiveAnnouncementsCount] = useState(0)
    const [totalUsersCount, setTotalUsersCount] = useState(0)
    const [pendingSupportCount, setPendingSupportCount] = useState(0)
    const [activeTab, setActiveTab] = useState('announcements')
    const [isSidenavOpen, setIsSidenavOpen] = useState(false)

    const toggleSidenav = () => setIsSidenavOpen(!isSidenavOpen)
    const closeSidenav = () => setIsSidenavOpen(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    const fetchStats = async () => {
        // Active Announcements
        const { count: aCount, error: aError } = await supabase
            .from('announcements')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)

        if (aError) console.error('Announcements fetch error:', aError)
        if (aCount !== null) setActiveAnnouncementsCount(aCount)

        // Total Users
        const { count: uCount, error: uError } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })

        if (uError) {
            console.error('Users fetch error:', uError)
            // We could set an error state here, but let's just make sure it's logged
        }
        if (uCount !== null) setTotalUsersCount(uCount)

        // Pending Support Tickets
        const { count: sCount, error: sError } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .in('status', ['open', 'in_progress'])

        if (sError) console.error('Support fetch error:', sError)
        if (sCount !== null) setPendingSupportCount(sCount)
    }

    const handleRefresh = () => {
        // Full page reload to ensure all data across all tabs is fresh
        window.location.reload()
    }

    useEffect(() => {
        fetchStats()

        const handleUpdate = () => fetchStats()
        window.addEventListener('announcements-updated', handleUpdate)
        return () => window.removeEventListener('announcements-updated', handleUpdate)
    }, [])

    return (
        <div className="dashboard-wrapper">
            <nav className="navbar glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, overflow: 'hidden' }}>
                    <button className="menu-toggle" onClick={toggleSidenav}>☰</button>
                    <div className="nav-brand">Admin Panel</div>
                    <div className="tabs-container" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', flex: 1 }}>
                        <button
                            className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
                            onClick={() => setActiveTab('announcements')}
                            style={{
                                background: activeTab === 'announcements' ? 'var(--primary-gradient)' : 'transparent',
                                color: activeTab === 'announcements' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                fontSize: '13px',
                                borderRadius: '10px',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            Announcements
                            {activeAnnouncementsCount > 0 && (
                                <span style={{ background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                                    {activeAnnouncementsCount}
                                </span>
                            )}
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                            style={{
                                background: activeTab === 'users' ? 'var(--primary-gradient)' : 'transparent',
                                color: activeTab === 'users' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                fontSize: '13px',
                                borderRadius: '10px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            Users
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
                            onClick={() => setActiveTab('system')}
                            style={{
                                background: activeTab === 'system' ? 'var(--primary-gradient)' : 'transparent',
                                color: activeTab === 'system' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                fontSize: '13px',
                                borderRadius: '10px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            System
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analytics')}
                            style={{
                                background: activeTab === 'analytics' ? 'var(--primary-gradient)' : 'transparent',
                                color: activeTab === 'analytics' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                fontSize: '13px',
                                borderRadius: '10px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            Analytics
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                            style={{
                                background: activeTab === 'security' ? 'var(--primary-gradient)' : 'transparent',
                                color: activeTab === 'security' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                fontSize: '13px',
                                borderRadius: '10px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            Security
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'support' ? 'active' : ''}`}
                            onClick={() => setActiveTab('support')}
                            style={{
                                background: activeTab === 'support' ? 'var(--primary-gradient)' : 'transparent',
                                color: activeTab === 'support' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                fontSize: '13px',
                                borderRadius: '10px',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            Support
                            {pendingSupportCount > 0 && (
                                <span style={{ background: '#ff9500', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                                    {pendingSupportCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                <div className="nav-actions">
                    <button onClick={handleRefresh} className="btn-outline refresh-btn" style={{ fontSize: '13px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="refresh-icon">↻</span>
                        <span className="hidden-mobile">Refresh</span>
                    </button>
                    <span className="user-email hidden-mobile">{session?.user?.email}</span>
                    <button onClick={handleLogout} className="btn-outline" style={{ fontSize: '13px', padding: '8px 16px' }}>Logout</button>
                </div>
            </nav>

            <main className="main-content">
                <header className="page-header">
                    <h1>{activeTab === 'announcements' ? 'Announcements' : activeTab === 'users' ? 'User Management' : activeTab === 'security' ? 'Security & Audit' : activeTab === 'analytics' ? 'Platform Analytics' : activeTab === 'support' ? 'User Support' : 'System Control'}</h1>
                </header>

                <div className="stats-grid">
                    <div className="stat-card glass-panel">
                        <span className="stat-icon">👥</span>
                        <h3>{activeTab === 'announcements' ? 'Active Announcements' : 'Total Users'}</h3>
                        <p className="stat-value" style={{ color: 'var(--primary)' }}>
                            {activeTab === 'announcements' ? activeAnnouncementsCount : totalUsersCount}
                        </p>
                    </div>
                    <div className="stat-card glass-panel">
                        <span className="stat-icon">⚡</span>
                        <h3>System Status</h3>
                        <p className="stat-value" style={{ color: 'var(--success)' }}>Operational</p>
                        <span style={{ color: 'var(--text-muted)' }}>Real-time health: OK</span>
                    </div>
                    <div className="stat-card glass-panel">
                        <span className="stat-icon">🗄️</span>
                        <h3>Database</h3>
                        <p className="stat-value" style={{ color: '#ff9500' }}>Connected</p>
                        <span style={{ color: 'var(--text-muted)' }}>Supabase Cloud</span>
                    </div>
                </div>

                {activeTab === 'announcements' ? <Announcements /> :
                    activeTab === 'users' ? <UserManagement /> :
                        activeTab === 'security' ? <SecurityLogs /> :
                            activeTab === 'analytics' ? <PlatformAnalytics /> :
                                activeTab === 'support' ? <SupportTickets /> :
                                    <SystemControl />}
            </main>

            <div className={`sidenav-overlay ${isSidenavOpen ? 'active' : ''}`} onClick={closeSidenav}></div>
            <div className={`mobile-sidenav ${isSidenavOpen ? 'active' : ''}`}>
                <div className="sidenav-header">
                    <div className="sidenav-logo">Admin Panel</div>
                    <button onClick={closeSidenav} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>×</button>
                </div>
                <div className="sidenav-links">
                    <button className={`sidenav-link ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => { setActiveTab('announcements'); closeSidenav(); }}>
                        📢 Announcements {activeAnnouncementsCount > 0 && <span className="badge">{activeAnnouncementsCount}</span>}
                    </button>
                    <button className={`sidenav-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); closeSidenav(); }}>
                        👥 User Management
                    </button>
                    <button className={`sidenav-link ${activeTab === 'system' ? 'active' : ''}`} onClick={() => { setActiveTab('system'); closeSidenav(); }}>
                        ⚙️ System Control
                    </button>
                    <button className={`sidenav-link ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('analytics'); closeSidenav(); }}>
                        📊 Platform Analytics
                    </button>
                    <button className={`sidenav-link ${activeTab === 'security' ? 'active' : ''}`} onClick={() => { setActiveTab('security'); closeSidenav(); }}>
                        🔐 Security & Audit
                    </button>
                    <button className={`sidenav-link ${activeTab === 'support' ? 'active' : ''}`} onClick={() => { setActiveTab('support'); closeSidenav(); }}>
                        🎧 User Support {pendingSupportCount > 0 && <span className="badge" style={{ background: '#ff9500' }}>{pendingSupportCount}</span>}
                    </button>
                </div>
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>{session?.user?.email}</div>
                    <button onClick={handleLogout} className="btn-outline" style={{ width: '100%', padding: '12px' }}>Logout</button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .tab-btn { transition: all 0.2s ease; border: none; cursor: pointer; }
                .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.08) !important; color: white !important; }
            `}} />
        </div>
    )
}
