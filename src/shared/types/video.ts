// src/shared/types/video.ts - Video synchronization types
// Note: This file already exists but is included here for completeness

export interface VideoState {
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    lastUpdate: number;
}

export type VideoSyncMode =
    | 'master'      // Controls video and broadcasts state (presentation display)
    | 'host'        // Can control video, syncs with presentation if available
    | 'independent' // No sync, local control only

export interface VideoSyncConfig {
    sessionId: string | null;
    mode: VideoSyncMode;
    allowHostAudio?: boolean;
    enableNativeControls?: boolean;
    onHostVideoClick?: (willPlay: boolean) => void;
    videoUrl?: string;
}

export interface VideoProps {
    ref: React.RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    muted: boolean;
    preload: string;
    crossOrigin?: string;
    onClick?: () => void;
    className?: string;
    style: {
        maxWidth: string;
        maxHeight: string;
        objectFit: 'contain';
    };
}

export interface VideoSyncReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    videoState: VideoState;
    play: (time?: number) => Promise<boolean>;
    pause: (time?: number) => Promise<boolean>;
    seek: (time: number) => Promise<boolean>;
    isConnectedToPresentation: boolean;
    getVideoProps: () => VideoProps;
}
