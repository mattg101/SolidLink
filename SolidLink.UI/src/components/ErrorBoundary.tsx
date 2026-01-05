import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    backgroundColor: '#2a1a1a',
                    color: '#ff4a4a',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center'
                }}>
                    <h2>UI Crash Detected</h2>
                    <p style={{ margin: '1rem 0', color: '#ccc' }}>{this.state.error?.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ padding: '8px 16px' }}
                    >
                        Reload UI
                    </button>
                </div>
            );
        }

        return this.children;
    }
}
