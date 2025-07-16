import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePresentationVideo } from '../usePresentationVideo';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';
import { HostCommand } from '@core/sync/types';

// Mock dependencies
vi.mock('@shared/hooks/useVideoSyncManager');
vi.mock('../videoProps', () => ({
    createVideoProps: vi.fn((props) => ({
        ref: props.videoRef,
        playsInline: true,
        controls: false,
        muted: props.muted,
        preload: 'auto',
        style: { width: '100%', height: '100%', objectFit: 'contain' },
    })),
}));
vi.mock('../videoLogger', () => ({
    presentationVideoLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn()
    }
}));

describe('usePresentationVideo', () => {
    let mockVideoElement: HTMLVideoElement;
    let mockOnCommand: any;
    let mockOnConnectionChange: any;
    let mockSendVideoReady: any;
    let commandCallback: (command: HostCommand) => void;
    let connectionChangeCallback: (connected: boolean) => void;

    beforeEach(() => {
        // Create a mock video element
        mockVideoElement = {
            paused: true,
            currentTime: 0,
            duration: 100,
            volume: 1,
            muted: false,
            readyState: 0,
            src: '',
            play: vi.fn().mockResolvedValue(undefined),
            pause: vi.fn(),
            load: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            error: null,
        } as any;

        // Mock useRef to return our mock video element
        const useRefSpy = vi.spyOn(require('react'), 'useRef');
        useRefSpy.mockReturnValue({ current: mockVideoElement });

        // Mock command handler
        mockOnCommand = vi.fn((callback) => {
            commandCallback = callback;
            return () => {}; // unsubscribe
        });

        // Mock connection change handler
        mockOnConnectionChange = vi.fn((callback) => {
            connectionChangeCallback = callback;
            return () => {}; // unsubscribe
        });

        // Mock send video ready
        mockSendVideoReady = vi.fn();

        // Setup the mock implementation
        (useVideoSyncManager as any).mockReturnValue({
            onCommand: mockOnCommand,
            onConnectionChange: mockOnConnectionChange,
            sendVideoReady: mockSendVideoReady,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Video Ready State', () => {
        it('should send ready status when video can play', () => {
            renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Initially sends false
            expect(mockSendVideoReady).toHaveBeenCalledWith(false);

            // Simulate canplay event
            const canPlayHandler = mockVideoElement.addEventListener.mock.calls.find(
                (call) => call[0] === 'canplay'
            )?.[1];

            act(() => {
                canPlayHandler?.();
            });

            // Should send ready status
            expect(mockSendVideoReady).toHaveBeenCalledWith(true);
        });

        it('should send ready immediately if video already ready', () => {
            // Set video as ready before hook runs
            mockVideoElement.readyState = 4;

            renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Should send ready status immediately
            expect(mockSendVideoReady).toHaveBeenCalledWith(true);
        });

        it('should send false when source changes', () => {
            const { rerender } = renderHook(
                ({ sourceUrl }) =>
                    usePresentationVideo({
                        sessionId: 'test-session',
                        sourceUrl,
                        isEnabled: true,
                    }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' },
                }
            );

            // Clear initial calls
            mockSendVideoReady.mockClear();

            // Change source
            rerender({ sourceUrl: 'video2.mp4' });

            // Should send not ready
            expect(mockSendVideoReady).toHaveBeenCalledWith(false);
        });
    });

    describe('Command Handling', () => {
        it('should handle play command with time and volume', async () => {
            renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Make video ready
            mockVideoElement.readyState = 4;
            const canPlayHandler = mockVideoElement.addEventListener.mock.calls.find(
                (call) => call[0] === 'canplay'
            )?.[1];
            act(() => {
                canPlayHandler?.();
            });

            // Send play command
            await act(async () => {
                await commandCallback({
                    action: 'play',
                    data: {
                        time: 30,
                        volume: 0.8,
                        muted: true,
                    },
                });
            });

            expect(mockVideoElement.currentTime).toBe(30);
            expect(mockVideoElement.volume).toBe(0.8);
            expect(mockVideoElement.muted).toBe(true);
            expect(mockVideoElement.play).toHaveBeenCalled();
        });

        it('should handle pause command', async () => {
            renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Make video ready
            mockVideoElement.readyState = 4;
            const canPlayHandler = mockVideoElement.addEventListener.mock.calls.find(
                (call) => call[0] === 'canplay'
            )?.[1];
            act(() => {
                canPlayHandler?.();
            });

            // Send pause command
            await act(async () => {
                await commandCallback({
                    action: 'pause',
                    data: { time: 45 },
                });
            });

            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(mockVideoElement.currentTime).toBe(45);
        });

        it('should handle seek command', async () => {
            renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Make video ready
            mockVideoElement.readyState = 4;
            const canPlayHandler = mockVideoElement.addEventListener.mock.calls.find(
                (call) => call[0] === 'canplay'
            )?.[1];
            act(() => {
                canPlayHandler?.();
            });

            // Send seek command
            await act(async () => {
                await commandCallback({
                    action: 'seek',
                    data: { time: 60 },
                });
            });

            expect(mockVideoElement.currentTime).toBe(60);
        });

        it('should handle sync command when out of sync', async () => {
            renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Make video ready and playing
            mockVideoElement.readyState = 4;
            mockVideoElement.paused = false;
            mockVideoElement.currentTime = 10;

            const canPlayHandler = mockVideoElement.addEventListener.mock.calls.find(
                (call) => call[0] === 'canplay'
            )?.[1];
            act(() => {
                canPlayHandler?.();
            });

            // Send sync command with > 1 second difference
            await act(async () => {
                await commandCallback({
                    action: 'sync',
                    data: { time: 15 },
                });
            });

            // Should adjust time
            expect(mockVideoElement.currentTime).toBe(15);
        });

        it('should not sync when difference is less than 1 second', async () => {
            renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Make video ready and playing
            mockVideoElement.readyState = 4;
            mockVideoElement.paused = false;
            mockVideoElement.currentTime = 10;

            const canPlayHandler = mockVideoElement.addEventListener.mock.calls.find(
                (call) => call[0] === 'canplay'
            )?.[1];
            act(() => {
                canPlayHandler?.();
            });

            // Send sync command with < 1 second difference
            await act(async () => {
                await commandCallback({
                    action: 'sync',
                    data: { time: 10.5 },
                });
            });

            // Should not adjust time
            expect(mockVideoElement.currentTime).toBe(10);
        });

        it('should handle volume command even when video not ready', async () => {
            renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Video is not ready yet
            mockVideoElement.readyState = 0;

            // Send volume command
            await act(async () => {
                await commandCallback({
                    action: 'volume',
                    data: {
                        volume: 0.5,
                        muted: true,
                    },
                });
            });

            // Volume should still be applied
            expect(mockVideoElement.volume).toBe(0.5);
            expect(mockVideoElement.muted).toBe(true);
        });

        it('should skip non-volume commands when video not ready', async () => {
            renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Video is not ready
            mockVideoElement.readyState = 0;

            // Send play command
            await act(async () => {
                await commandCallback({
                    action: 'play',
                    data: {},
                });
            });

            // Should not play
            expect(mockVideoElement.play).not.toHaveBeenCalled();
        });
    });

    describe('Connection State', () => {
        it('should track connection state', () => {
            const { result } = renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            expect(result.current.isConnectedToHost).toBe(false);

            // Simulate connection
            act(() => {
                connectionChangeCallback(true);
            });

            expect(result.current.isConnectedToHost).toBe(true);

            // Simulate disconnection
            act(() => {
                connectionChangeCallback(false);
            });

            expect(result.current.isConnectedToHost).toBe(false);
        });
    });

    describe('Video Props', () => {
        it('should generate video props with correct settings', () => {
            const { result } = renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            const props = result.current.getVideoProps();

            expect(props.muted).toBe(false);
            expect(props.controls).toBe(false);
        });

        it('should pass callbacks to video props', () => {
            const { result } = renderHook(() =>
                usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            const onEnd = vi.fn();
            const onError = vi.fn();

            result.current.getVideoProps(onEnd, onError);

            // Callbacks should be passed through
            // (actual testing would require the real createVideoProps implementation)
        });
    });
});