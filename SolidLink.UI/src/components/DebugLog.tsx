import React, { useState, useEffect, useRef } from 'react';

export interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
}

export const useLogger = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    useEffect(() => {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        const addEntry = (message: any, level: LogEntry['level']) => {
            const msgString = typeof message === 'string' ? message : JSON.stringify(message);
            const entry: LogEntry = {
                timestamp: new Date().toLocaleTimeString(),
                level,
                message: msgString
            };
            setLogs(prev => [...prev.slice(-99), entry]);
        };

        console.log = (...args) => {
            addEntry(args.join(' '), 'info');
            originalLog.apply(console, args);
        };
        console.error = (...args) => {
            addEntry(args.join(' '), 'error');
            originalError.apply(console, args);
        };
        console.warn = (...args) => {
            addEntry(args.join(' '), 'warn');
            originalWarn.apply(console, args);
        };

        return () => {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
        };
    }, []);

    const log = (message: string, level: LogEntry['level'] = 'info') => {
        // This manual log function is still useful for specific tagging
        const entry: LogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            level,
            message: `[MANUAL] ${message}`
        };
        setLogs(prev => [...prev.slice(-99), entry]);
        console[level](message);
    };

    return { logs, log };
};

export const DebugLog: React.FC<{ logs: LogEntry[]; isOpen: boolean; onClose: () => void }> = ({ logs, isOpen, onClose }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '30px',
            right: '10px',
            width: '400px',
            height: '300px',
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontFamily: 'monospace',
            fontSize: '12px'
        }}>
            <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#252525'
            }}>
                <span style={{ color: '#aaa', fontWeight: 'bold' }}>DEBUG LOG</span>
                <button onClick={onClose} style={{ padding: '2px 8px', fontSize: '10px' }}>Close</button>
            </div>
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}
            >
                {logs.length === 0 && <div style={{ color: '#555' }}>No logs yet...</div>}
                {logs.map((entry, i) => (
                    <div key={i} style={{
                        color: entry.level === 'error' ? '#ff4a4a' : (entry.level === 'warn' ? '#ffcc00' : '#ddd'),
                        borderLeft: `2px solid ${entry.level === 'error' ? '#ff4a4a' : (entry.level === 'warn' ? '#ffcc00' : '#4a9eff')}`,
                        paddingLeft: '6px'
                    }}>
                        <span style={{ color: '#666', marginRight: '6px' }}>[{entry.timestamp}]</span>
                        {entry.message}
                    </div>
                ))}
            </div>
        </div>
    );
};
