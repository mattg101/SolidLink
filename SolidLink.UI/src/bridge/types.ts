/**
 * Type definitions for the WebView2-React JSON Bridge.
 */

/**
 * Core message envelope for all bridge communications.
 */
export interface BridgeMessage<T = unknown> {
  type: string;
  correlationId?: string;
  payload?: T;
  error?: string;
}

// --- Payload Types ---

export interface ConnectionStatusPayload {
  status: 'connected' | 'disconnected';
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// --- Message Type Constants ---
export const MessageTypes = {
  PING: 'PING',
  PONG: 'PONG',
  CONNECTION_STATUS: 'CONNECTION_STATUS',
  REQUEST_TREE: 'REQUEST_TREE',
  TREE_RESPONSE: 'TREE_RESPONSE',
  ERROR: 'ERROR',
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];
