/**
 * Type declarations for WebView2 integration.
 * Extends the Window interface to include chrome.webview.
 */

interface WebView2 {
    postMessage(message: unknown): void;
    addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
    removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

interface Chrome {
    webview?: WebView2;
}

declare global {
    interface Window {
        chrome?: Chrome;
    }
}

export { };
