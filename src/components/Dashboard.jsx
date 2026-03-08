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
    const [activeTab, setActiveTab] = useState('announcements') // 'announcements' | 'users' | 'system' | 'security' | 'analytics' | 'support'

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

    useEffect(() => {
        fetchStats()

        const handleUpdate = () => fetchStats()
        window.addEventListener('announcements-updated', handleUpdate)
        return () => window.removeEventListener('announcements-updated', handleUpdate)
    }, [])

    return (
        <div className="dashboard-wrapper">
            <nav className="navbar glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <div className="nav-brand">TUBA Admin</div>
                    <div className="tabs-container" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
                            onClick={() => setActiveTab('announcements')}
                            style={{
                                background: activeTab === 'announcements' ? 'var(--primary-gradient)' : 'transparent',
                                color: activeTab === 'announcements' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                fontSize: '14px',
                                borderRadius: '10px',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            Announcements
                            {activeAnnouncementsCount > 0 && (
                                <span style={{ background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
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
                                fontSize: '14px',
                                borderRadius: '10px'
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
                                fontSize: '14px',
                                borderRadius: '10px'
                            }}
                        >
                            System Control
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analytics')}
                            style={{
                                background: activeTab === 'analytics' ? 'var(--primary-gradient)' : 'transparent',
                                color: activeTab === 'analytics' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                fontSize: '14px',
                                borderRadius: '10px'
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
                                fontSize: '14px',
                                borderRadius: '10px'
                            }}
                        >
                            Security Log
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'support' ? 'active' : ''}`}
                            onClick={() => setActiveTab('support')}
                            style={{
                                background: activeTab === 'support' ? 'var(--primary-gradient)' : 'transparent',
                                color: activeTab === 'support' ? 'white' : 'var(--text-muted)',
                                padding: '8px 16px',
                                fontSize: '14px',
                                borderRadius: '10px',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            Support
                            {pendingSupportCount > 0 && (
                                <span style={{ background: '#ff9500', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                                    {pendingSupportCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                <div className="nav-actions">
                    <span className="user-email">{session?.user?.email}</span>
                    <button onClick={handleLogout} className="btn-outline">Logout</button>
                </div>
            </nav>

            <main className="main-content">
                <header className="page-header">
                    <h1>{activeTab === 'announcements' ? 'Announcements' : activeTab === 'users' ? 'User Management' : activeTab === 'security' ? 'Security & Audit' : activeTab === 'analytics' ? 'Platform Analytics' : activeTab === 'support' ? 'User Support' : 'System Control'}</h1>
                    <p>
                        {activeTab === 'announcements' ? 'Manage global application announcements.' :
                            activeTab === 'users' ? 'Monitor and manage user profiles and subscriptions.' :
                                activeTab === 'security' ? 'Review access logs, suspicious activities, and policy overrides.' :
                                    activeTab === 'analytics' ? 'Overview of signups, MRR, and platform health.' :
                                        activeTab === 'support' ? 'Manage user feedback, bug reports, and support tickets.' :
                                            'Global application overrides and health monitoring.'}
                    </p>
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
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <p className="stat-value" style={{ color: 'var(--success)' }}>Operational</p>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Real-time health: OK</span>
                    </div>
                    <div className="stat-card glass-panel">
                        <span className="stat-icon">🗄️</span>
                        <h3>Database</h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <p className="stat-value" style={{ color: '#ff9500' }}>Connected</p>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Supabase Cloud</span>
                    </div>
                </div>

                {activeTab === 'announcements' ? <Announcements /> :
                    activeTab === 'users' ? <UserManagement /> :
                        activeTab === 'security' ? <SecurityLogs /> :
                            activeTab === 'analytics' ? <PlatformAnalytics /> :
                                activeTab === 'support' ? <SupportTickets /> :
                                    <SystemControl />}
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                .tab-btn { transition: all 0.2s ease; border: none; cursor: pointer; }
                .tab-btn:hover:not(.active) { background: rgba(255,255,255,0.08) !important; color: white !important; }
            `}} />
        </div>
    )
}
