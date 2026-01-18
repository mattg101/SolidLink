/**
 * Singleton client for WebView2-React JSON Bridge communication.
 */
import './webview2.d';
import type { BridgeMessage } from './types';

type MessageHandler<T = unknown> = (message: BridgeMessage<T>) => void;

interface PendingRequest {
    resolve: (value: BridgeMessage) => void;
    reject: (reason: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
}

class BridgeClient {
    private static instance: BridgeClient;
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private pendingRequests: Map<string, PendingRequest> = new Map();
    private initialized = false;

    private constructor() { }

    static getInstance(): BridgeClient {
        if (!BridgeClient.instance) {
            BridgeClient.instance = new BridgeClient();
        }
        return BridgeClient.instance;
    }

    /**
     * Initialize the bridge client. Call once on app mount.
     */
    init(): void {
        if (this.initialized) return;

        // Check if running in WebView2 context
        if (typeof window !== 'undefined' && window.chrome?.webview) {
            window.chrome.webview.addEventListener('message', this.onMessage.bind(this));
        } else {
            console.warn('[BridgeClient] Not running in WebView2 context. Bridge will be mocked.');
        }

        this.initialized = true;
    }

    /**
     * Send a fire-and-forget message to the C# backend.
     */
    send<T = unknown>(type: string, payload?: T): void {
        const message: BridgeMessage<T> = {
            type,
            correlationId: this.generateId(),
            payload,
        };

        if (window.chrome?.webview) {
            window.chrome.webview.postMessage(message);
        }
    }

    /**
     * Send a request and await a response.
     */
    request<TReq = unknown, TRes = unknown>(
        type: string,
        payload?: TReq,
        timeoutMs = 5000
    ): Promise<BridgeMessage<TRes>> {
        return new Promise((resolve, reject) => {
            const correlationId = this.generateId();
            const message: BridgeMessage<TReq> = {
                type,
                correlationId,
                payload,
            };

            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(correlationId);
                reject(new Error(`Request '${type}' timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            this.pendingRequests.set(correlationId, {
                resolve: resolve as (value: BridgeMessage) => void,
                reject,
                timeoutId,
            });

            if (window.chrome?.webview) {
                window.chrome.webview.postMessage(message);
            } else {
                // Mock: immediately reject for dev outside WebView2
                clearTimeout(timeoutId);
                this.pendingRequests.delete(correlationId);
                reject(new Error('Not in WebView2 context'));
            }
        });
    }

    /**
     * Subscribe to messages of a specific type.
     */
    on<T = unknown>(type: string, handler: MessageHandler<T>): () => void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)!.add(handler as MessageHandler);

        // Return unsubscribe function
        return () => this.off(type, handler);
    }

    /**
     * Unsubscribe from messages of a specific type.
     */
    off<T = unknown>(type: string, handler: MessageHandler<T>): void {
        this.handlers.get(type)?.delete(handler as MessageHandler);
    }

    private onMessage(event: MessageEvent): void {
        try {
            const message = event.data as BridgeMessage;

            // Check if this is a response to a pending request
            if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
                const pending = this.pendingRequests.get(message.correlationId)!;
                clearTimeout(pending.timeoutId);
                this.pendingRequests.delete(message.correlationId);

                if (message.error) {
                    pending.reject(new Error(message.error));
                } else {
                    pending.resolve(message);
                }
                return;
            }

            // Dispatch to handlers
            const handlers = this.handlers.get(message.type);
            if (handlers) {
                handlers.forEach((handler) => handler(message));
            }
        } catch (err) {
            console.error('[BridgeClient] Error processing message:', err);
        }
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}

// Export singleton instance
export const bridgeClient = BridgeClient.getInstance();

// Auto-initialize on import
bridgeClient.init();
