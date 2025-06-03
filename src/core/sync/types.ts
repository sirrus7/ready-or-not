// src/core/sync/types.ts
import {Slide} from '@shared/types/game';

export interface HostCommand {
    type: 'HOST_COMMAND';
    sessionId: string;
    id: string;
    action: 'play' | 'pause' | 'seek' | 'reset';
    time?: number;
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

export interface PingMessage {
    type: 'PING';
    sessionId: string;
    timestamp: number;
}
