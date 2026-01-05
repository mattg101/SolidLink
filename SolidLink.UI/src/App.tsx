import { useState } from 'react'
import './App.css'
import { ConnectionStatus } from './components/ConnectionStatus'

function App() {
  const [connectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')

  return (
    <div id="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <header style={{
        padding: '1rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--color-bg-secondary)'
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          SolidLink
        </h1>
        <button onClick={() => console.log('Settings clicked')}>
          Settings
        </button>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
        <div className="panel" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>No Model Loaded</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Open an assembly in SolidWorks to begin.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer style={{
        padding: '0.5rem 1rem',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <ConnectionStatus status={connectionStatus} />
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>v0.1.0</span>
      </footer>
    </div>
  )
}

export default App
