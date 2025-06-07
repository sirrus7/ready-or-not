// src/shared/utils/video/usePresentationVideo.ts - FINAL: Syncs with host commands
import {useRef, useCallback, useState, useEffect} from 'react';
import {SimpleBroadcastManager, ConnectionStatus} from '@core/sync/SimpleBroadcastManager';
import {HostCommand} from '@core/sync/types';

interface VideoElementProps {
    ref: React.RefObject<HTMLVideoElement>;
    playsInline: boolean;
    controls: boolean;
    autoPlay: boolean;
    muted: boolean;
    preload: string;
    style: React.CSSProperties;
}

interface UsePresentationVideoReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    isConnectedToHost: boolean;
    getVideoProps: (onVideoEnd?: () => void, onError?: () => void) => VideoElementProps;
}

interface UsePresentationVideoProps {
    sessionId: string | null;
    sourceUrl: string | null;
    isEnabled: boolean;
}

export const usePresentationVideo = ({
                                         sessionId,
                                         sourceUrl,
                                         isEnabled
                                     }: UsePresentationVideoProps): UsePresentationVideoReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isConnectedToHost, setIsConnectedToHost] = useState(false);
    const broadcastManager = sessionId ? SimpleBroadcastManager.getInstance(sessionId, 'presentation') : null;

    const onEndedRef = useRef<(() => void) | undefined>();
    const onErrorRef = useRef<(() => void) | undefined>();

    const executeCommand = useCallback(async (command: HostCommand): Promise<void> => {
        const video = videoRef.current;
        if (!video) return;

        setIsConnectedToHost(true);

        try {
            switch (command.action) {
                case 'play':
                    if (command.time !== undefined && Math.abs(video.currentTime - command.time) > 1) video.currentTime = command.time;
                    await video.play();
                    break;
                case 'pause':
                    video.pause();
                    if (command.time !== undefined) video.currentTime = command.time;
                    break;
                case 'seek':
                    if (command.time !== undefined) video.currentTime = command.time;
                    break;
                case 'reset':
                    video.pause();
                    video.currentTime = 0;
                    break;
            }
        } catch (error) {
            console.error(`[usePresentationVideo] Failed to execute ${command.action}:`, error);
            onErrorRef.current?.();
        }
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => onEndedRef.current?.();
        const handleError = () => onErrorRef.current?.();

        if (isEnabled && sourceUrl) {
            if (video.currentSrc !== sourceUrl) {
                video.src = sourceUrl;
                video.load();
            }
        } else if (!isEnabled && video.currentSrc) {
            video.pause();
            video.removeAttribute('src');
            video.load();
        }

        video.addEventListener('ended', handleEnded);
        video.addEventListener('error', handleError);
        return () => {
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('error', handleError);
        };
    }, [sourceUrl, isEnabled]);

    useEffect(() => {
        if (!broadcastManager) return;
        const unsubscribe = broadcastManager.onHostCommand(executeCommand);
        const unsubscribeStatus = broadcastManager.onPresentationStatus((status: ConnectionStatus) => {
            setIsConnectedToHost(status === 'connected');
        });
        return () => {
            unsubscribe();
            unsubscribeStatus();
        };
    }, [broadcastManager, executeCommand]);

    const getVideoProps = useCallback((onVideoEnd?: () => void, onError?: () => void): VideoElementProps => {
        onEndedRef.current = onVideoEnd;
        onErrorRef.current = onError;
        return {
            ref: videoRef,
            playsInline: true,
            controls: false,
            autoPlay: false,
            muted: false,
            preload: 'auto',
            style: {width: '100%', height: '100%', objectFit: 'contain'}
        };
    }, []);

    return {videoRef, isConnectedToHost, getVideoProps};
};
