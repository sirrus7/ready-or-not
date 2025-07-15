import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHostVideo } from '../useHostVideo';
import { useSimpleVideoSync } from '../useSimpleVideoSync';

// Mock dependencies
vi.mock('../useSimpleVideoSync');
vi.mock('../videoProps', () => ({
    createVideoProps: vi.fn((props) => ({
        ref: props.videoRef,
        playsInline: true,
        controls: false,
        autoPlay: props.autoPlay,
        muted: props.muted,
        preload: 'auto',
        style: { width: '100%', height: '100%', objectFit: 'contain' },
    })),
    useChromeSupabaseOptimizations: vi.fn(),
}));

describe('useHostVideo', () => {
    let mockVideoRef: { current: HTMLVideoElement | null };
    let mockControls: any;
    let mockState: any;

    beforeEach(() => {
        mockVideoRef = { current: null };
        mockControls = {
            play: vi.fn().mockResolvedValue(undefined),
            pause: vi.fn().mockResolvedValue(undefined),
            seek: vi.fn().mockResolvedValue(undefined),
            setVolume: vi.fn(),
            toggleMute: vi.fn(),
        };
        mockState = {
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            volume: 1,
            isMuted: false,
            hostReady: false,
            presentationReady: false,
            presentationConnected: false,
        };

        (useSimpleVideoSync as any).mockReturnValue({
            videoRef: mockVideoRef,
            state: mockState,
            controls: mockControls,
            audioTarget: 'host',
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Auto-play behavior', () => {
        it('should auto-play when host is ready and presentation not connected', async () => {
            const { rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            // Simulate host becoming ready
            mockState.hostReady = true;
            rerender();

            // Wait for effect to run
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(mockControls.play).toHaveBeenCalled();
        });

        it('should wait for both videos before auto-playing when presentation is connected', async () => {
            const { rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            // Host ready but presentation connected and not ready
            mockState.hostReady = true;
            mockState.presentationConnected = true;
            mockState.presentationReady = false;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should not play yet
            expect(mockControls.play).not.toHaveBeenCalled();

            // Now presentation becomes ready
            mockState.presentationReady = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Now it should play
            expect(mockControls.play).toHaveBeenCalled();
        });

        it('should only auto-play once per source', async () => {
            const { rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            // First time ready
            mockState.hostReady = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(mockControls.play).toHaveBeenCalledTimes(1);

            // Re-render with same source
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should not play again
            expect(mockControls.play).toHaveBeenCalledTimes(1);
        });

        it('should auto-play again when source changes', async () => {
            const { rerender } = renderHook(
                ({ sourceUrl }) =>
                    useHostVideo({
                        sessionId: 'test-session',
                        sourceUrl,
                        isEnabled: true,
                        autoPlay: true,
                    }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' },
                }
            );

            // First video ready
            mockState.hostReady = true;
            rerender({ sourceUrl: 'video1.mp4' });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(mockControls.play).toHaveBeenCalledTimes(1);

            // Change source
            rerender({ sourceUrl: 'video2.mp4' });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should play the new video
            expect(mockControls.play).toHaveBeenCalledTimes(2);
        });

        it('should handle presentation connection during auto-play attempt', async () => {
            const { rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            // Start with presentation not connected
            mockState.hostReady = true;
            mockState.presentationConnected = false;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should auto-play when no presentation
            expect(mockControls.play).toHaveBeenCalledTimes(1);

            // Now simulate presentation connecting with a new video
            mockState.presentationConnected = true;
            const { rerender: rerender2 } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video2.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            rerender2();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should not auto-play the new video
            expect(mockControls.play).toHaveBeenCalledTimes(1);
        });
    });

    describe('Control wrapping', () => {
        it('should wrap play command with optional time parameter', async () => {
            const { result } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Play without time
            await act(async () => {
                await result.current.play();
            });

            expect(mockControls.seek).not.toHaveBeenCalled();
            expect(mockControls.play).toHaveBeenCalled();

            // Play with time
            await act(async () => {
                await result.current.play(30);
            });

            expect(mockControls.seek).toHaveBeenCalledWith(30);
            expect(mockControls.play).toHaveBeenCalledTimes(2);
        });

        it('should wrap pause command with optional time parameter', async () => {
            const { result } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Pause without time
            await act(async () => {
                await result.current.pause();
            });

            expect(mockControls.seek).not.toHaveBeenCalled();
            expect(mockControls.pause).toHaveBeenCalled();

            // Pause with time
            await act(async () => {
                await result.current.pause(45);
            });

            expect(mockControls.seek).toHaveBeenCalledWith(45);
            expect(mockControls.pause).toHaveBeenCalledTimes(2);
        });
    });

    describe('State exposure', () => {
        it('should expose presentation connection state', () => {
            const { result, rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            expect(result.current.isConnectedToPresentation).toBe(false);

            // Update connection state
            mockState.presentationConnected = true;
            rerender();

            expect(result.current.isConnectedToPresentation).toBe(true);
        });

        it('should expose presentation audio state', () => {
            const { result, rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            expect(result.current.presentationMuted).toBe(false);
            expect(result.current.presentationVolume).toBe(1);

            // Update audio state
            mockState.isMuted = true;
            mockState.volume = 0.5;
            rerender();

            expect(result.current.presentationMuted).toBe(true);
            expect(result.current.presentationVolume).toBe(0.5);
        });
    });

    describe('Video props generation', () => {
        it('should mute host when presentation is connected', () => {
            const { result, rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Not connected - host should not be muted
            (useSimpleVideoSync as any).mockReturnValue({
                videoRef: mockVideoRef,
                state: mockState,
                controls: mockControls,
                audioTarget: 'host',
            });
            rerender();

            const propsNotConnected = result.current.getVideoProps();
            expect(propsNotConnected.muted).toBe(false);

            // Connected - host should be muted
            mockState.presentationConnected = true;
            (useSimpleVideoSync as any).mockReturnValue({
                videoRef: mockVideoRef,
                state: mockState,
                controls: mockControls,
                audioTarget: 'presentation',
            });
            rerender();

            const propsConnected = result.current.getVideoProps();
            expect(propsConnected.muted).toBe(true);
        });
    });
});