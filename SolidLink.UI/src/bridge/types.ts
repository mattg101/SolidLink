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
  axisDirection?: number[];
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

export type RobotNodeType = 'body' | 'sensor' | 'frame';
export type RobotJointType = 'fixed' | 'revolute' | 'linear';

export interface RobotNode {
  id: string;
  name: string;
  type: RobotNodeType;
  children: string[];
  geometryIds: string[];
  frameId?: string;
}

export interface RobotJoint {
  id: string;
  parentId: string;
  childId: string;
  type: RobotJointType;
  axisRefId?: string;
  axis?: number[];
}

export interface RobotDefinition {
  nodes: RobotNode[];
  joints: RobotJoint[];
}

export interface RobotDefinitionHistoryEntry {
  id: string;
  versionNumber?: number;
  message: string;
  timestampUtc: string;
}

export interface RobotDefinitionHistoryPayload {
  history: RobotDefinitionHistoryEntry[];
  linkedPath?: string;
  modelPath?: string;
  linkedMissing?: boolean;
}

export interface RobotDefinitionSaveVersionPayload {
  definition: RobotDefinition;
  message: string;
}

export interface RobotDefinitionLoadVersionPayload {
  id: string;
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
  ROBOT_DEF_SAVE: 'ROBOT_DEF_SAVE',
  ROBOT_DEF_LOAD: 'ROBOT_DEF_LOAD',
  ROBOT_DEF_LOAD_FILE: 'ROBOT_DEF_LOAD_FILE',
  ROBOT_DEF_LOAD_VERSION: 'ROBOT_DEF_LOAD_VERSION',
  ROBOT_DEF_SAVE_VERSION: 'ROBOT_DEF_SAVE_VERSION',
  ROBOT_DEF_HISTORY_REQUEST: 'ROBOT_DEF_HISTORY_REQUEST',
  ROBOT_DEF_HISTORY: 'ROBOT_DEF_HISTORY',
  ROBOT_DEF_LINK_DEFAULT: 'ROBOT_DEF_LINK_DEFAULT',
  ROBOT_DEF_UNDO: 'ROBOT_DEF_UNDO',
  ROBOT_DEF_REDO: 'ROBOT_DEF_REDO',
  ROBOT_DEF_UPDATE: 'ROBOT_DEF_UPDATE',
  ERROR: 'ERROR',
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];
