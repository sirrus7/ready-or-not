// src/utils/video/types.ts - Core video types and interfaces
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
    autoPlay: boolean;
    muted: boolean;
    preload: string;
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
