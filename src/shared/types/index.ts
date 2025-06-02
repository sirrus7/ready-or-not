// src/shared/types/index.ts - Main barrel file for all shared types

// Export all types from their respective domain files
export * from './api';
export * from './database';
export * from './game';
export * from './ui';
export * from './state';
export * from './sync';

// Note: Video-specific types (VideoState, VideoSyncMode) are in src/shared/types/video.ts
// and are re-exported by src/shared/utils/video/index.ts. They are kept separate
// as they belong specifically to the video utility.
