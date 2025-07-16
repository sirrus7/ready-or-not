// src/core/sync/types.ts
import {Slide} from '@shared/types/game';
import {Team, TeamDecision, TeamRoundData, SyncAction } from "@shared/types";

export interface HostCommand {
    type: 'HOST_COMMAND';
    sessionId: string;
    id: string;
    action: SyncAction;
    data?: {
        time: number;
        volume?: number;
        muted?: boolean;
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

export interface PresentationPong {
    type: 'PRESENTATION_PONG';
    sessionId: string;
    timestamp: number;
    videoLoaded: boolean;
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

