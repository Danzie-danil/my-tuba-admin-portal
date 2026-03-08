import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg('')

        // Only allow specific admin emails if needed, or rely on RLS/Supabase auth
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setErrorMsg(error.message)
        }
        setLoading(false)
    }

    return (
        <div className="login-wrapper">
            <div className="login-card glass-panel">
                <h2>Developer Admin</h2>
                <p>Sign in to manage TUBA Finances</p>

                {errorMsg && <div className="error-alert">{errorMsg}</div>}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Admin Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tubafinancing@gmail.com"
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Authenticating...' : 'Secure Login'}
                    </button>
                </form>
            </div>
        </div>
    )
}
