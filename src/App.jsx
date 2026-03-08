import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkSession = async (currentSession) => {
    if (currentSession && currentSession.user.email !== 'tubafinancing@gmail.com') {
      await supabase.auth.signOut()
      setSession(null)
      alert('Access Denied: This portal is restricted to the Developer Admin.')
    } else {
      setSession(currentSession)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      checkSession(initialSession).then(() => setLoading(false))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, authSession) => {
      checkSession(authSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="loading-screen">Loading Admin Portal...</div>
  }

  return (
    <div className="app-container">
      {!session ? <Login /> : <Dashboard session={session} />}
    </div>
  )
}

export default App
