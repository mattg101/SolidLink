import { useState, useEffect } from 'react'
import './App.css'
import { ConnectionStatus } from './components/ConnectionStatus'
import { useBridge, bridgeClient, MessageTypes } from './bridge'
import type { ConnectionStatusPayload } from './bridge'

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const [debugInfo, setDebugInfo] = useState({
    wv2Present: false,
    lastMessage: 'None',
    renderTime: new Date().toLocaleTimeString()
  })

  useEffect(() => {
    const check = setInterval(() => {
      const present = !!(window as any).chrome?.webview
      setDebugInfo(prev => ({
        ...prev,
        wv2Present: present,
        renderTime: new Date().toLocaleTimeString()
      }))
      if (present) {
        bridgeClient.init() // Ensure init runs if it missed it earlier
      }
    }, 1000)
    return () => clearInterval(check)
  }, [])

  // Subscribe to CONNECTION_STATUS messages from C# backend
  useBridge<ConnectionStatusPayload>(MessageTypes.CONNECTION_STATUS, (message) => {
    setDebugInfo(prev => ({ ...prev, lastMessage: `STATUS: ${message.payload?.status}` }))
    if (message.payload?.status === 'connected') {
      setConnectionStatus('connected')
    }
  })

  // Also listen for PONG as a connection verification
  useBridge(MessageTypes.PONG, () => {
    setDebugInfo(prev => ({ ...prev, lastMessage: 'PONG' }))
    setConnectionStatus('connected')
  })

  // Send UI_READY and PING on mount to initiate handshake
  useEffect(() => {
    console.log('[App] Component mounted, signaling UI_READY');
    bridgeClient.send('UI_READY');
    bridgeClient.send(MessageTypes.PING);

    // Backup: retry after 2 seconds if still connecting
    const timer = setTimeout(() => {
      bridgeClient.send('UI_READY');
    }, 2000);

    return () => clearTimeout(timer);
  }, [])

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
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ConnectionStatus status={connectionStatus} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>v0.1.0</span>
        </div>
        <div style={{
          fontSize: '10px',
          color: 'var(--color-text-secondary)',
          borderTop: '1px solid #333',
          paddingTop: '4px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>WV2: {debugInfo.wv2Present ? '✅' : '❌'} | Last: {debugInfo.lastMessage}</span>
          <span>{debugInfo.renderTime}</span>
        </div>
      </footer>
    </div>
  )
}

export default App
