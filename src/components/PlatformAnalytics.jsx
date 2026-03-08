import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function PlatformAnalytics() {
    const [metrics, setMetrics] = useState(null)
    const [signupData, setSignupData] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchAnalytics = async () => {
        setLoading(true)

        // Use the RPC functions we created
        const { data: metricsData, error: metricsError } = await supabase.rpc('admin_get_platform_metrics')
        if (metricsData) setMetrics(metricsData)
        if (metricsError) console.error('Error fetching metrics:', metricsError)

        const { data: signupsData, error: signupsError } = await supabase.rpc('admin_get_daily_signups', { days_count: 14 })
        if (signupsData) setSignupData(signupsData)
        if (signupsError) console.error('Error fetching signups:', signupsError)

        setLoading(false)
    }

    useEffect(() => {
        fetchAnalytics()
    }, [])

    // Simple robust bar chart generation
    const maxSignups = Math.max(...signupData.map(d => d.new_users), 1) // prevent div by zero

    return (
        <div className="section-container">
            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Calculating platform metrics...</p>
            ) : (
                <>
                    {/* KPI Grid */}
                    <div className="stats-grid" style={{ marginBottom: '32px' }}>
                        <div className="stat-card glass-panel" style={{ background: 'linear-gradient(135deg, rgba(88, 86, 214, 0.1), rgba(0,0,0,0.4))', border: '1px solid rgba(88, 86, 214, 0.3)' }}>
                            <span className="stat-icon">💰</span>
                            <h3>Est. MRR</h3>
                            <p className="stat-value" style={{ color: 'var(--text-main)', fontSize: '32px' }}>
                                ${metrics?.est_mrr?.toFixed(2) || '0.00'}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Based on active paid subscriptions.
                            </p>
                        </div>

                        <div className="stat-card glass-panel">
                            <span className="stat-icon">📈</span>
                            <h3>Trial Conversion</h3>
                            <p className="stat-value" style={{ color: 'var(--success)' }}>
                                {metrics?.conversion_rate || '0'}%
                            </p>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '4px' }}>
                                <span style={{ color: 'var(--success)' }}>{metrics?.active_paid} Paid</span>
                                <span style={{ color: 'var(--text-muted)' }}>|</span>
                                <span style={{ color: 'var(--text-muted)' }}>{metrics?.expired} Expired</span>
                            </div>
                        </div>

                        <div className="stat-card glass-panel">
                            <span className="stat-icon">👥</span>
                            <h3>Active Trials</h3>
                            <p className="stat-value" style={{ color: '#ff9500' }}>
                                {metrics?.active_trial || '0'}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Users currently in 48h trial window.
                            </p>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="glass-panel p-24">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                    Growth
                                </h3>
                                <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>New Signups (14 Days)</h2>
                            </div>
                        </div>

                        {/* Custom CSS Bar Chart */}
                        <div style={{
                            height: '250px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '8px',
                            paddingTop: '20px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            overflowX: 'auto',
                            position: 'relative'
                        }}>
                            {signupData.map((day, i) => {
                                const heightPercent = (day.new_users / maxSignups) * 100
                                const dateObj = new Date(day.signup_date)
                                const isToday = dateObj.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]

                                return (
                                    <div key={i} style={{
                                        flex: 1,
                                        minWidth: '30px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px',
                                        height: '100%'
                                    }}>
                                        {/* Bar Wrapper */}
                                        <div style={{
                                            flex: 1,
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'flex-end',
                                            justifyContent: 'center',
                                            position: 'relative'
                                        }}>
                                            <div
                                                className="chart-bar"
                                                title={`${day.new_users} signups on ${dateObj.toLocaleDateString()}`}
                                                style={{
                                                    height: `${Math.max(heightPercent, 2)}%`,
                                                    width: '100%',
                                                    maxWidth: '40px',
                                                    background: isToday ? 'var(--success)' : 'var(--primary-gradient)',
                                                    borderRadius: '6px 6px 0 0',
                                                    transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    opacity: heightPercent === 0 ? 0.3 : 1
                                                }}
                                            >
                                                {/* Tooltip on hover */}
                                                <span className="chart-tooltip" style={{
                                                    position: 'absolute',
                                                    top: '-25px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    opacity: 0,
                                                    transition: 'opacity 0.2s'
                                                }}>
                                                    {day.new_users}
                                                </span>
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: '10px',
                                            color: isToday ? 'var(--text-main)' : 'var(--text-muted)',
                                            whiteSpace: 'nowrap',
                                            fontWeight: isToday ? 700 : 400
                                        }}>
                                            {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                )
                            })}
                            {signupData.length === 0 && <p style={{ position: 'absolute', width: '100%', textAlign: 'center', top: '50%', color: 'var(--text-muted)' }}>No recent signup data.</p>}
                        </div>
                    </div>
                </>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .chart-bar:hover { opacity: 0.8 !important; }
                .chart-bar:hover .chart-tooltip { opacity: 1 !important; color: white; }
            `}} />
        </div>
    )
}
