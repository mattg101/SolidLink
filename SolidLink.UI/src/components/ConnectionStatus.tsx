import React from 'react';

interface ConnectionStatusProps {
    status: 'connected' | 'disconnected' | 'connecting';
    lastPing?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, lastPing }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'var(--color-success)';
            case 'connecting': return 'var(--color-accent)';
            case 'disconnected': return 'var(--color-error)';
            default: return 'var(--color-text-secondary)';
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(),
                boxShadow: `0 0 4px ${getStatusColor()}`
            }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
            {lastPing && (
                <span style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}>
                    ({lastPing})
                </span>
            )}
        </div>
    );
};
