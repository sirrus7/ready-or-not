// src/shared/types/sync.ts
// These types define payloads for BroadcastChannel or other sync mechanisms

// Use 'import type' for type-only imports
import type {GamePhaseNode} from './game';

export interface HostBroadcastPayload {
    currentSlideId: number | null;
    currentPhaseId: string | null;
    currentPhaseType: GamePhaseNode['phase_type'] | null;
    currentRoundNumber: 0 | 1 | 2 | 3 | null;
    isPlayingVideo: boolean;
    videoCurrentTime?: number;
    triggerVideoSeek?: boolean;
    isDecisionPhaseActive: boolean;
    decisionOptionsKey?: string;
    decisionPhaseTimerEndTime?: number;
}

export type SyncAction = 'play' | 'pause' | 'seek' | 'reset' | 'close_presentation' | 'decision_reset' | 'sync' | 'volume';
