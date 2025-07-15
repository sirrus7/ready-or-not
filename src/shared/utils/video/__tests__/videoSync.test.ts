import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSimpleVideoSync } from '../useSimpleVideoSync';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';

// Mock the video sync manager
vi.mock('@shared/hooks/useVideoSyncManager');

describe('Video Sync Tests', () => {
    let mockVideoElement: HTMLVideoElement;
    let mockOnConnectionChange: any;
    let mockOnVideoReady: any;
    let mockSendCommand: any;
    let connectionChangeCallback: (connected: boolean) => void;
    let videoReadyCallback: (ready: boolean) => void;

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
        } as any;

        // Create mock refs
        Object.defineProperty(HTMLVideoElement.prototype, 'ref', {
            get: () => ({ current: mockVideoElement }),
            configurable: true,
        });

        // Mock connection change handler
        mockOnConnectionChange = vi.fn((callback) => {
            connectionChangeCallback = callback;
            return () => {}; // unsubscribe
        });

        // Mock video ready handler
        mockOnVideoReady = vi.fn((callback) => {
            videoReadyCallback = callback;
            return () => {}; // unsubscribe
        });

        // Mock send command
        mockSendCommand = vi.fn();

        // Setup the mock implementation
        (useVideoSyncManager as any).mockReturnValue({
            isConnected: false,
            sendCommand: mockSendCommand,
            onConnectionChange: mockOnConnectionChange,
            onVideoReady: mockOnVideoReady,
        });

        // Mock document.createElement to return our mock video element
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
            if (tagName === 'video') {
                return mockVideoElement as any;
            }
            return originalCreateElement(tagName);
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Presentation Connection', () => {
        it('should pause video when presentation connects', () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Mock the video ref to have our mock element
            Object.defineProperty(result.current.videoRef, 'current', {
                writable: true,
                value: mockVideoElement
            });

            // Set video to playing state
            mockVideoElement.paused = false;

            // Simulate presentation connection
            act(() => {
                connectionChangeCallback(true);
            });

            // Verify video was paused
            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(true);
        });

        it('should ALWAYS pause video when presentation opens, even if already paused', () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Mock the video ref to have our mock element
            Object.defineProperty(result.current.videoRef, 'current', {
                writable: true,
                value: mockVideoElement
            });

            // Video is already paused
            mockVideoElement.paused = true;

            // Simulate presentation connection
            act(() => {
                connectionChangeCallback(true);
            });

            // Verify pause was still called to ensure sync
            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(true);
        });

        it('should not pause video if already paused when presentation connects', () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Video is already paused
            mockVideoElement.paused = true;

            // Simulate presentation connection
            act(() => {
                connectionChangeCallback(true);
            });

            // Verify pause was not called
            expect(mockVideoElement.pause).not.toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(true);
        });

        it('should reset presentation ready state when disconnected', () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Set presentation as ready and connected
            act(() => {
                connectionChangeCallback(true);
                videoReadyCallback(true);
            });

            expect(result.current.state.presentationReady).toBe(true);

            // Disconnect presentation
            act(() => {
                connectionChangeCallback(false);
            });

            expect(result.current.state.presentationConnected).toBe(false);
            expect(result.current.state.presentationReady).toBe(false);
        });
    });

    describe('Audio Routing', () => {
        it('should mute host when presentation is connected', () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Initially not muted
            expect(mockVideoElement.muted).toBe(false);

            // Connect presentation
            act(() => {
                connectionChangeCallback(true);
            });

            // Host should be muted
            expect(mockVideoElement.muted).toBe(true);
        });

        it('should restore host audio when presentation disconnects', () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Connect and then disconnect
            act(() => {
                connectionChangeCallback(true);
            });
            expect(mockVideoElement.muted).toBe(true);

            act(() => {
                connectionChangeCallback(false);
            });

            // Host audio should be restored based on mute state
            expect(mockVideoElement.muted).toBe(result.current.state.isMuted);
        });
    });

    describe('Video Commands', () => {
        it('should send play command to presentation when connected', async () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Set host as ready and presentation as connected
            act(() => {
                result.current.state.hostReady = true;
                connectionChangeCallback(true);
            });

            // Play video
            await act(async () => {
                await result.current.controls.play();
            });

            // Verify play command was sent
            expect(mockSendCommand).toHaveBeenCalledWith('play', {
                time: mockVideoElement.currentTime,
                volume: result.current.state.volume,
                muted: result.current.state.isMuted,
            });
        });

        it('should send pause command to presentation when connected', async () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Connect presentation
            act(() => {
                connectionChangeCallback(true);
            });

            // Pause video
            await act(async () => {
                await result.current.controls.pause();
            });

            // Verify pause command was sent
            expect(mockSendCommand).toHaveBeenCalledWith('pause', {
                time: mockVideoElement.currentTime,
            });
        });

        it('should send volume changes to presentation', () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Connect presentation
            act(() => {
                connectionChangeCallback(true);
            });

            // Change volume
            act(() => {
                result.current.controls.setVolume(0.5);
            });

            // Verify volume command was sent
            expect(mockSendCommand).toHaveBeenCalledWith('volume', {
                volume: 0.5,
            });
        });

        it('should apply volume locally when presentation not connected', () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Change volume without presentation
            act(() => {
                result.current.controls.setVolume(0.7);
            });

            // Verify volume applied to host
            expect(mockVideoElement.volume).toBe(0.7);
            expect(mockSendCommand).not.toHaveBeenCalled();
        });
    });

    describe('Video State Management', () => {
        it('should track video ready state', () => {
            const { result } = renderHook(() =>
                useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl: 'test-video.mp4',
                    isEnabled: true,
                })
            );

            // Initially not ready
            expect(result.current.state.hostReady).toBe(false);

            // Simulate canplay event
            const canPlayHandler = mockVideoElement.addEventListener.mock.calls.find(
                (call) => call[0] === 'canplay'
            )?.[1];

            act(() => {
                canPlayHandler?.();
            });

            expect(result.current.state.hostReady).toBe(true);
        });

        it('should reset state when source changes', () => {
            const { result, rerender } = renderHook(
                ({ sourceUrl }) =>
                    useSimpleVideoSync({
                        sessionId: 'test-session',
                        sourceUrl,
                        isEnabled: true,
                    }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' },
                }
            );

            // Set some state
            act(() => {
                result.current.state.hostReady = true;
                result.current.state.currentTime = 50;
            });

            // Change source
            rerender({ sourceUrl: 'video2.mp4' });

            // State should be reset
            expect(result.current.state.hostReady).toBe(false);
            expect(result.current.state.currentTime).toBe(0);
        });
    });
});