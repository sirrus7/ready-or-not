import { describe, it, expect, vi, beforeEach } from 'vitest';
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
vi.mock('../videoLogger', () => ({
    hostVideoLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    },
    videoSyncLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    },
    presentationVideoLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    },
    hostLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

describe('Video Sync Timing - Non-deterministic scenarios', () => {
    let mockVideoRef: { current: HTMLVideoElement | null };
    let mockControls: any;
    let mockState: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
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

    describe('Presentation connection race conditions', () => {
        it('should not auto-play when presentation connects just before host becomes ready', async () => {
            const { rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            // Presentation connects first
            mockState.presentationConnected = true;
            rerender();

            // Then host becomes ready
            mockState.hostReady = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should not auto-play
            expect(mockControls.play).not.toHaveBeenCalled();
        });

        it('should not auto-play when events arrive in this order: host ready → presentation connects → presentation ready', async () => {
            const { rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            // 1. Host becomes ready
            mockState.hostReady = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should auto-play when no presentation
            expect(mockControls.play).toHaveBeenCalledTimes(1);
            mockControls.play.mockClear();

            // 2. Presentation connects (this should pause the video)
            mockState.presentationConnected = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // 3. Presentation becomes ready 
            mockState.presentationReady = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should NOT auto-play again
            expect(mockControls.play).not.toHaveBeenCalled();
        });

        it('should handle rapid connection/disconnection cycles', async () => {
            const { rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            // Start with host ready and no presentation
            mockState.hostReady = true;
            mockState.presentationConnected = false;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should auto-play initially
            expect(mockControls.play).toHaveBeenCalledTimes(1);
            mockControls.play.mockClear();

            // Rapid connect/disconnect
            for (let i = 0; i < 5; i++) {
                // Connect
                mockState.presentationConnected = true;
                mockState.presentationReady = false;
                rerender();

                await act(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                });

                // Disconnect
                mockState.presentationConnected = false;
                mockState.presentationReady = false;
                rerender();

                await act(async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                });
            }

            // Should not auto-play again during rapid cycles
            expect(mockControls.play).not.toHaveBeenCalled();
        });

        it('should handle presentation ready before connection status', async () => {
            const { rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            mockState.hostReady = true;

            // Presentation ready signal arrives first (shouldn't happen but testing edge case)
            mockState.presentationReady = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should auto-play (no connection yet)
            expect(mockControls.play).toHaveBeenCalledTimes(1);
            mockControls.play.mockClear();

            // Then connection status arrives
            mockState.presentationConnected = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should not auto-play again
            expect(mockControls.play).not.toHaveBeenCalled();
        });

        it('should handle multiple source changes with presentation connection', async () => {
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

            mockState.hostReady = true;
            mockState.presentationConnected = true;
            mockState.presentationReady = true;

            // Change sources multiple times
            const sources = ['video2.mp4', 'video3.mp4', 'video4.mp4'];
            for (const source of sources) {
                rerender({ sourceUrl: source });
                
                await act(async () => {
                    await new Promise(resolve => setTimeout(resolve, 0));
                });
            }

            // Should never auto-play when presentation is connected
            expect(mockControls.play).not.toHaveBeenCalled();
        });

        it('should correctly track autoPlayed state per source regardless of presentation', async () => {
            const { rerender } = renderHook(
                ({ sourceUrl, presentationConnected }) =>
                    useHostVideo({
                        sessionId: 'test-session',
                        sourceUrl,
                        isEnabled: true,
                        autoPlay: true,
                    }),
                {
                    initialProps: { 
                        sourceUrl: 'video1.mp4',
                        presentationConnected: false 
                    },
                }
            );

            // Setup initial state
            mockState.hostReady = true;
            mockState.presentationConnected = false;
            
            // First render - should auto-play
            rerender({ sourceUrl: 'video1.mp4', presentationConnected: false });
            
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(mockControls.play).toHaveBeenCalledTimes(1);
            mockControls.play.mockClear();

            // Connect presentation
            mockState.presentationConnected = true;
            rerender({ sourceUrl: 'video1.mp4', presentationConnected: true });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should not play again for same source
            expect(mockControls.play).not.toHaveBeenCalled();

            // New source with presentation connected
            rerender({ sourceUrl: 'video2.mp4', presentationConnected: true });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should not auto-play new source when presentation connected
            expect(mockControls.play).not.toHaveBeenCalled();

            // Disconnect presentation
            mockState.presentationConnected = false;
            rerender({ sourceUrl: 'video3.mp4', presentationConnected: false });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should auto-play new source when presentation not connected
            expect(mockControls.play).toHaveBeenCalledTimes(1);
        });
    });

    describe('Edge cases and timing issues', () => {
        it('should handle state updates arriving out of order', async () => {
            const { rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            // All states arrive at once
            mockState.hostReady = true;
            mockState.presentationConnected = true;
            mockState.presentationReady = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should not auto-play when presentation is connected
            expect(mockControls.play).not.toHaveBeenCalled();
        });

        it('should handle slow presentation ready signal', async () => {
            const { rerender } = renderHook(() =>
                useHostVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                    autoPlay: true,
                })
            );

            // Host ready
            mockState.hostReady = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(mockControls.play).toHaveBeenCalledTimes(1);
            mockControls.play.mockClear();

            // Presentation connects
            mockState.presentationConnected = true;
            rerender();

            // Simulate a delay before presentation is ready
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Presentation finally ready
            mockState.presentationReady = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Should not auto-play
            expect(mockControls.play).not.toHaveBeenCalled();
        }, 10000); // Increase test timeout
    });
});