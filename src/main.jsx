import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Auto-update service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Optionally alert user or just auto-update since we use registerType: 'autoUpdate' in vite config
  },
  onOfflineReady() {
    console.log('Admin Portal is ready to work offline.')
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
