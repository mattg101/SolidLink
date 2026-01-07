import { ConnectionStatus } from './components/ConnectionStatus'
import { useBridge, bridgeClient, MessageTypes } from './bridge'
import type { ConnectionStatusPayload, BridgeMessage } from './bridge'
import { SelectionProvider, useSelection } from './context/SelectionContext'
import { Viewport } from './components/Viewport/Viewport'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DebugLog, useLogger } from './components/DebugLog'
import { useState, useEffect } from 'react'

interface RobotTree {
  name: string;
  rootFrame: Frame;
}

interface Frame {
  id: string;
  name: string;
  type: string;
  referencePath: string;
  children: Frame[];
  links: any[];
}

const TreeItem = ({ frame, level = 0, filter }: { frame: Frame; level?: number; filter?: string }) => {
  const [isOpen, setIsOpen] = useState(true);
  const { selectedId, setSelectedId, hoveredId, setHoveredId } = useSelection();
  const hasChildren = frame.children && frame.children.length > 0;

  const isSelected = selectedId === frame.id;
  const isHovered = hoveredId === frame.id;
  const isMatch = filter && frame.name.toLowerCase().includes(filter.toLowerCase());

  // Auto-expand if child is a match
  useEffect(() => {
    if (filter) setIsOpen(true);
  }, [filter]);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(frame.id);
  };

  return (
    <div style={{ marginLeft: `${level * 12} px` }}>
      <div
        onClick={(e) => {
          if (hasChildren) setIsOpen(!isOpen);
          handleSelect(e);
        }}
        onMouseEnter={(e) => {
          setHoveredId(frame.id);
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={(e) => {
          setHoveredId(null);
          e.currentTarget.style.backgroundColor = isSelected ? 'rgba(74, 158, 255, 0.15)' : 'transparent';
        }}
        style={{
          padding: '4px 8px',
          cursor: hasChildren ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.875rem',
          borderRadius: '4px',
          backgroundColor: isSelected ? 'rgba(74, 158, 255, 0.15)' : 'transparent',
          borderLeft: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
          transition: 'all 0.2s',
          opacity: filter && !isMatch ? 0.5 : 1
        }}
      >
        <span style={{ fontSize: '10px', width: '12px' }}>
          {hasChildren ? (isOpen ? '▼' : '▶') : '•'}
        </span>
        <span style={{
          color: isSelected ? 'var(--color-primary)' : (frame.links.length > 0 ? '#4fc3f7' : 'inherit'),
          fontWeight: isMatch ? '600' : 'normal',
          textDecoration: isMatch ? 'underline' : 'none'
        }}>
          {frame.name}
        </span>
      </div>
      {isOpen && hasChildren && (
        <div>
          {frame.children.map(child => (
            <TreeItem key={child.id} frame={child} level={level + 1} filter={filter} />
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const [tree, setTree] = useState<RobotTree | null>(null)
  const [filter, setFilter] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const { logs, log } = useLogger();

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
    setDebugInfo(prev => ({ ...prev, lastMessage: `STATUS: ${message.payload?.status} ` }))
    if (message.payload?.status === 'connected') {
      setConnectionStatus('connected')
    }
  })

  // Also listen for PONG as a connection verification
  useBridge(MessageTypes.PONG, () => {
    setDebugInfo(prev => ({ ...prev, lastMessage: 'PONG' }))
    setConnectionStatus('connected')
  })

  // Global error capture
  useEffect(() => {
    const handleError = (e: ErrorEvent) => log(`Runtime Error: ${e.message} `, 'error');
    window.addEventListener('error', handleError);
    log('App initialized', 'debug');
    return () => window.removeEventListener('error', handleError);
  }, []);

  // also listen for TREE_RESPONSE
  useBridge<RobotTree>('TREE_RESPONSE', (message) => {
    log(`Received TREE_RESPONSE for model: ${message.payload?.name}`, 'info');
    setTree(message.payload);
  })

  useBridge<string>('ERROR_RESPONSE', (message) => {
    log(`Backend Error: ${message.payload}`, 'error');
  })

  const refreshTree = () => {
    log('Sending REQUEST_TREE...', 'info');
    bridgeClient.send('REQUEST_TREE');
  };

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
      <main style={{ flex: 1, padding: '1rem', overflow: 'auto', display: 'flex', gap: '1rem' }}>
        {/* Sidebar / Tree */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                Robot Hierarchy
              </h2>
              <button
                disabled={connectionStatus !== 'connected'}
                onClick={refreshTree}
                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              >
                Refresh
              </button>
            </div>
            <input
              type="text"
              placeholder="Filter names..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', fontSize: '0.875rem' }}
            />
          </div>


          <div className="panel" style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
            {tree ? (
              <TreeItem frame={tree.rootFrame} filter={filter} />
            ) : (
              <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>No Model</h3>
              </div>
            )}
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="panel" style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', padding: 0 }}>
          <ErrorBoundary>
            {tree ? (
              <Viewport tree={tree} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🧊</div>
                  <h3>3D Viewport</h3>
                  <p>Refresh tree to see 3D visualization</p>
                </div>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer style={{ padding: '4px 12px', borderTop: '1px solid #333', fontSize: '10px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ConnectionStatus status={connectionStatus} />
          <span>WV2: {debugInfo.wv2Present ? '✅' : '❌'}</span>
          <span>| Last: {debugInfo.lastMessage}</span>
          <span style={{ cursor: 'pointer', color: 'var(--color-primary)', textDecoration: 'underline' }} onClick={() => setShowLogs(!showLogs)}>
            [Toggle Logs]
          </span>
        </div>
        <div>v0.1.0</div>
      </footer>

      <DebugLog logs={logs} isOpen={showLogs} onClose={() => setShowLogs(false)} />
    </div>
  )
}

const AppWrapper = () => (
  <SelectionProvider>
    <App />
  </SelectionProvider>
)

export default AppWrapper
