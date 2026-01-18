import { useState, useEffect } from 'react';
import './TestLabel.css';

declare global {
  interface Window {
    __setTestLabel__?: (label: string | null) => void;
  }
}

export const TestLabel = () => {
  const [label, setLabel] = useState<string | null>(null);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!isDev) return;
    
    window.__setTestLabel__ = (text: string | null) => {
      setLabel(text);
    };
    
    return () => {
      delete window.__setTestLabel__;
    };
  }, [isDev]);

  if (!isDev || !label) return null;

  return (
    <div className="test-label-overlay" data-testid="test-label">
      <div className="test-label-content">
        {label}
      </div>
    </div>
  );
};
