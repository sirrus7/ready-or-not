// src/core/sync/types.ts
import {Slide} from '@shared/types/game';
import {Team, TeamDecision, TeamRoundData} from "@shared/types";

export enum BroadcastEventType {
    HOST_COMMAND = 'HOST_COMMAND',
    SLIDE_UPDATE = 'SLIDE_UPDATE',
    PRESENTATION_STATUS = 'PRESENTATION_STATUS',
    CLOSE_PRESENTATION = 'CLOSE_PRESENTATION',
    PRESENTATION_VIDEO_READY = 'PRESENTATION_VIDEO_READY',
    COMMAND_ACK = 'COMMAND_ACK',
    JOIN_INFO = 'JOIN_INFO',
    JOIN_INFO_CLOSE = 'JOIN_INFO_CLOSE',
    PING = 'PING',
    PRESENTATION_DISCONNECT = 'PRESENTATION_DISCONNECT',
    VIDEO_STATUS_POLL = 'VIDEO_STATUS_POLL',
    VIDEO_STATUS_RESPONSE = 'VIDEO_STATUS_RESPONSE',
}

export interface HostCommand {
    type: BroadcastEventType.HOST_COMMAND;
    sessionId: string;
    id: string;
    action: 'play'
        | 'pause'
        | 'seek'
        | 'reset'
        | 'close_presentation'
        | 'decision_reset'
        | 'sync'
        | 'volume'
        | 'video_status_poll'
        | 'scroll';
    data?: {
        time: number;
        volume: number;
        muted: boolean;
        playbackRate?: number;
        scrollTop?: number;
    };
    timestamp: number;
}

export interface SlideUpdate {
    type: BroadcastEventType.SLIDE_UPDATE;
    sessionId: string;
    slide: Slide;
    teamData?: {
        teams: Team[];
        teamRoundData: Record<string, Record<number, TeamRoundData>>;
        teamDecisions: TeamDecision[];
    };
    timestamp: number;
}

export interface PresentationStatus {
    type: BroadcastEventType.PRESENTATION_STATUS;
    sessionId: string;
    status: 'ready' | 'pong';
    timestamp: number;
}

export interface PresentationVideoReady {
    type: BroadcastEventType.PRESENTATION_VIDEO_READY;
    sessionId: string;
    timestamp: number;
}

export interface CommandAck {
    type: BroadcastEventType.COMMAND_ACK;
    sessionId: string;
    commandId: string;
    timestamp: number;
}

export interface JoinInfoMessage {
    type: BroadcastEventType.JOIN_INFO;
    sessionId: string;
    joinUrl: string;
    qrCodeDataUrl: string;
    timestamp: number;
}

export interface VideoStatusPoll {
    type: BroadcastEventType.VIDEO_STATUS_POLL;
    sessionId: string;
    timestamp: number;
}

export interface VideoStatusResponse {
    type: BroadcastEventType.VIDEO_STATUS_RESPONSE;
    sessionId: string;
    isReady: boolean;
    timestamp: number;
}

export { TeamGameEventType } from './SimpleRealtimeManager';
