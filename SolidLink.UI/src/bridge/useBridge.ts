/**
 * React hook for subscribing to bridge messages at the component level.
 */
import { useEffect, useRef } from 'react';
import { bridgeClient } from './bridgeClient';
import type { BridgeMessage } from './types';

type MessageHandler<T = unknown> = (message: BridgeMessage<T>) => void;

/**
 * Subscribe to bridge messages of a specific type.
 * Automatically cleans up subscription on unmount.
 * 
 * @param type - The message type to subscribe to.
 * @param handler - Callback invoked when a message of this type is received.
 */
export function useBridge<T = unknown>(type: string, handler: MessageHandler<T>): void {
    // Use ref to avoid re-subscribing on every render
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        const wrappedHandler: MessageHandler<T> = (message) => {
            handlerRef.current(message);
        };

        const unsubscribe = bridgeClient.on(type, wrappedHandler);
        return unsubscribe;
    }, [type]);
}
