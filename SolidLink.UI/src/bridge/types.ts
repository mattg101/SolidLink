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

export interface TreeFilterPayload {
  query: string;
  visibleIds: string[];
}

export interface HiddenStatePayload {
  hiddenIds: string[];
}

export interface HideRequestPayload {
  ids: string[];
  includeDescendants: boolean;
}

export interface UnhideRequestPayload {
  ids: string[];
  includeDescendants: boolean;
}

export interface RefGeometryNode {
  id: string;
  type: 'axis' | 'csys';
  name: string;
  path: string;
  parentPath: string;
  localTransform?: {
    position?: number[];
    rotation?: number[];
    matrix?: number[];
  };
}

export type RefGeometryListPayload = RefGeometryNode[];

export interface RefGeometryHidePayload {
  ids: string[];
  hidden: boolean;
}

export interface RefOriginTogglePayload {
  id: string;
  showOrigin: boolean;
}

export interface RefOriginGlobalTogglePayload {
  enabled: boolean;
}

// --- Message Type Constants ---
export const MessageTypes = {
  PING: 'PING',
  PONG: 'PONG',
  CONNECTION_STATUS: 'CONNECTION_STATUS',
  REQUEST_TREE: 'REQUEST_TREE',
  TREE_RESPONSE: 'TREE_RESPONSE',
  TREE_FILTER: 'TREE_FILTER',
  HIDE_REQUEST: 'HIDE_REQUEST',
  UNHIDE_REQUEST: 'UNHIDE_REQUEST',
  HIDDEN_STATE_UPDATE: 'HIDDEN_STATE_UPDATE',
  HIDDEN_STATE_RESTORE: 'HIDDEN_STATE_RESTORE',
  REF_GEOMETRY_LIST: 'REF_GEOMETRY_LIST',
  REF_GEOMETRY_HIDE: 'REF_GEOMETRY_HIDE',
  REF_ORIGIN_TOGGLE: 'REF_ORIGIN_TOGGLE',
  REF_ORIGIN_GLOBAL_TOGGLE: 'REF_ORIGIN_GLOBAL_TOGGLE',
  ERROR: 'ERROR',
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];
