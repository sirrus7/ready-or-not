// src/core/sync/types.ts
import {Slide} from '@shared/types/game';

export interface HostCommand {
    type: 'HOST_COMMAND';
    sessionId: string;
    id: string;
    action: 'play' | 'pause' | 'seek' | 'reset' | 'close_presentation' | 'decision_reset' | 'sync' | 'volume';
    data?: {
        time?: number;
        volume?: number;
        muted?: boolean;
        playbackRate?: number;
        waitingForBuffer?: boolean;
        // [key: string]: any;
    }; // ✅ NEW: Added data field for custom command data
    timestamp: number;
}

export interface SlideUpdate {
    type: 'SLIDE_UPDATE';
    sessionId: string;
    slide: Slide;
    timestamp: number;
}

export interface PresentationStatus {
    type: 'PRESENTATION_STATUS';
    sessionId: string;
    status: 'ready' | 'pong';
    timestamp: number;
}

export interface CommandAck {
    type: 'COMMAND_ACK';
    sessionId: string;
    commandId: string;
    timestamp: number;
}
