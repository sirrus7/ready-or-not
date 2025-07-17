// src/core/sync/index.ts
export type { ConnectionStatus, KpiUpdateData } from './SimpleBroadcastManager';
export type { HostCommand, SlideUpdate, PresentationStatus } from './types';

// NEW: Export SimpleRealtimeManager
export { SimpleRealtimeManager } from './SimpleRealtimeManager';
export type { RealtimeConnectionStatus, TeamGameEvent } from './SimpleRealtimeManager';
