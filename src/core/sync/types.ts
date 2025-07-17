// src/core/sync/types.ts
import {Slide} from '@shared/types/game';
import {Team, TeamDecision, TeamRoundData} from "@shared/types";

export interface HostCommand {
    type: 'HOST_COMMAND';
    sessionId: string;
    id: string;
    action: 'play' | 'pause' | 'seek' | 'reset' | 'close_presentation' | 'decision_reset' | 'sync' | 'volume';
    data?: {
        time: number;
        volume: number;
        muted: boolean;
        playbackRate?: number;
        // [key: string]: any;
    }; // ✅ NEW: Added data field for custom command data
    timestamp: number;
}

export interface SlideUpdate {
    type: 'SLIDE_UPDATE';
    sessionId: string;
    slide: Slide;
    teamData?: { // NEW: Add optional team data
        teams: Team[];
        teamRoundData: Record<string, Record<number, TeamRoundData>>;
        teamDecisions: TeamDecision[];
    };
    timestamp: number;
}

export interface PresentationStatus {
    type: 'PRESENTATION_STATUS';
    sessionId: string;
    status: 'ready' | 'pong';
    timestamp: number;
}

export interface PresentationVideoReady {
    type: 'PRESENTATION_VIDEO_READY';
    sessionId: string;
    timestamp: number;
}

export interface CommandAck {
    type: 'COMMAND_ACK';
    sessionId: string;
    commandId: string;
    timestamp: number;
}

export interface JoinInfoMessage {
    type: 'JOIN_INFO';
    sessionId: string;
    joinUrl: string;
    qrCodeDataUrl: string;
    timestamp: number;
}
