import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Mock the video sync manager BEFORE importing the hook that uses it
vi.mock('@shared/hooks/useVideoSyncManager');

// Mock the logger
vi.mock('../videoLogger', () => ({
    videoSyncLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Import after mocking
import { useSimpleVideoSync } from '../useSimpleVideoSync';
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';

// Get the mocked version
const mockedUseVideoSyncManager = vi.mocked(useVideoSyncManager);

describe('useSimpleVideoSync - Fixed Tests', () => {
    let mockVideoElement: any;
    let mockSendCommand: any;
    let mockSetPresentationReady: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create mock functions
        mockSendCommand = vi.fn();
        mockSetPresentationReady = vi.fn();
        
        // Create mock video element
        mockVideoElement = {
            play: vi.fn().mockResolvedValue(undefined),
            pause: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            readyState: 4,
            currentTime: 0,
            duration: 100,
            paused: true,
            volume: 1,
            muted: false,
            src: 'test.mp4',
            load: vi.fn()
        };

        // Mock React.useRef
        vi.spyOn(React, 'useRef').mockReturnValue({ current: mockVideoElement });

        // Setup the mock implementation
        mockedUseVideoSyncManager.mockReturnValue({
            sendCommand: mockSendCommand,
            isConnected: false,
            onConnectionChange: vi.fn((callback) => {
                (global as any).__videoSyncConnectionCallback = callback;
                return () => { (global as any).__videoSyncConnectionCallback = null; };
            }),
            onVideoReady: vi.fn((callback) => {
                (global as any).__videoSyncVideoReadyCallback = callback;
                return () => { (global as any).__videoSyncVideoReadyCallback = null; };
            }),
            setPresentationReady: mockSetPresentationReady,
            sendVideoReady: vi.fn(),
            onCommand: vi.fn()
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        (global as any).__videoSyncConnectionCallback = null;
        (global as any).__videoSyncVideoReadyCallback = null;
    });

    describe('Volume Control', () => {
        it('should apply volume changes to host video when presentation is not connected', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Initial volume should be 1
            expect(result.current.state.volume).toBe(1);

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.5);
            });

            // Verify host video volume was updated
            expect(mockVideoElement.volume).toBe(0.5);
            expect(result.current.state.volume).toBe(0.5);
        });

        it('should send volume command to presentation when connected', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Simulate presentation connected 
            act(() => {
                const callback = (global as any).__videoSyncConnectionCallback;
                if (callback) callback(true);
            });

            // Clear previous calls
            mockSendCommand.mockClear();

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.7);
            });

            // Verify command was sent with only volume
            expect(mockSendCommand).toHaveBeenCalledWith('volume', { volume: 0.7 });
        });

        it('should toggle mute state independently of volume', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Initial state should not be muted
            expect(result.current.state.isMuted).toBe(false);

            // Toggle mute
            act(() => {
                result.current.controls.toggleMute();
            });

            expect(result.current.state.isMuted).toBe(true);
            expect(result.current.state.volume).toBe(1); // Volume unchanged
        });

        it('should maintain audio target based on presentation connection', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Initially should target host
            expect(result.current.audioTarget).toBe('host');

            // Simulate presentation connected
            act(() => {
                const callback = (global as any).__videoSyncConnectionCallback;
                if (callback) callback(true);
            });

            // Should now target presentation
            expect(result.current.audioTarget).toBe('presentation');
        });
    });

    describe('Connection behavior', () => {
        it('should pause video when presentation connects', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Start with video playing
            mockVideoElement.paused = false;

            // Clear any initial calls
            mockVideoElement.pause.mockClear();

            // Simulate presentation connecting
            act(() => {
                const callback = (global as any).__videoSyncConnectionCallback;
                if (callback) callback(true);
            });

            // Verify video was paused
            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(true);
        });

        it('should pause video when presentation disconnects', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // First connect presentation
            act(() => {
                const callback = (global as any).__videoSyncConnectionCallback;
                if (callback) callback(true);
            });

            // Start playing the video
            mockVideoElement.paused = false;

            // Clear any previous calls
            mockVideoElement.pause.mockClear();

            // Simulate presentation disconnecting
            act(() => {
                const callback = (global as any).__videoSyncConnectionCallback;
                if (callback) callback(false);
            });

            // Verify video was paused
            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(false);
            expect(result.current.state.presentationReady).toBe(false);
        });

        it('should maintain playback state through connection changes', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Start playing
            mockVideoElement.paused = false;
            
            // Trigger play event
            act(() => {
                const playHandler = mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'play')?.[1];
                if (playHandler) playHandler();
            });

            expect(result.current.state.isPlaying).toBe(true);

            // Connect presentation
            act(() => {
                const callback = (global as any).__videoSyncConnectionCallback;
                if (callback) callback(true);
            });

            // State should still be playing
            expect(result.current.state.isPlaying).toBe(true);

            // Disconnect presentation
            act(() => {
                const callback = (global as any).__videoSyncConnectionCallback;
                if (callback) callback(false);
            });

            // State should still be playing
            expect(result.current.state.isPlaying).toBe(true);
        });
    });

    describe('volume persistence during slide transitions', () => {
        it('should persist volume when video source changes', () => {
            const { result, rerender } = renderHook(
                ({ sourceUrl }) => useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' }
                }
            );

            // Set volume to 0.6
            act(() => {
                result.current.controls.setVolume(0.6);
            });
            expect(mockVideoElement.volume).toBe(0.6);

            // Change video source (simulating slide transition)
            mockVideoElement.src = '';
            rerender({ sourceUrl: 'video2.mp4' });

            // Wait for effect to run
            act(() => {});

            // Verify volume was applied to the new video
            expect(mockVideoElement.load).toHaveBeenCalled();
            expect(mockVideoElement.volume).toBe(0.6);
        });

        it('should persist mute state when video source changes', () => {
            const { result, rerender } = renderHook(
                ({ sourceUrl }) => useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' }
                }
            );

            // Mute the video
            act(() => {
                result.current.controls.toggleMute();
            });
            expect(result.current.state.isMuted).toBe(true);

            // Change video source
            mockVideoElement.src = '';
            rerender({ sourceUrl: 'video2.mp4' });

            // Wait for effect to run
            act(() => {});

            // Verify mute state was applied to the new video
            expect(mockVideoElement.muted).toBe(true);
        });

        it('should keep host muted during transitions when presentation is connected', () => {
            const { result, rerender } = renderHook(
                ({ sourceUrl }) => useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' }
                }
            );

            // Simulate presentation connected
            act(() => {
                const callback = (global as any).__videoSyncConnectionCallback;
                if (callback) callback(true);
            });

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.7);
            });

            // Change video source
            mockVideoElement.src = '';
            rerender({ sourceUrl: 'video2.mp4' });

            // Wait for effect to run
            act(() => {});

            // Verify host remains muted but volume is preserved
            expect(mockVideoElement.muted).toBe(true);
            expect(mockVideoElement.volume).toBe(0.7);
        });

        it('should handle rapid slide transitions without losing volume', () => {
            const { result, rerender } = renderHook(
                ({ sourceUrl }) => useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' }
                }
            );

            // Set initial volume
            act(() => {
                result.current.controls.setVolume(0.4);
            });

            // Perform rapid transitions
            const videos = ['video2.mp4', 'video3.mp4', 'video4.mp4', 'video5.mp4'];
            videos.forEach(video => {
                mockVideoElement.src = '';
                rerender({ sourceUrl: video });
                act(() => {}); // Let effects run
                expect(mockVideoElement.volume).toBe(0.4);
            });

            // Verify load was called for each transition
            expect(mockVideoElement.load).toHaveBeenCalledTimes(videos.length);
        });

        it('should send volume with play command to presentation after transition', async () => {
            const { result, rerender } = renderHook(
                ({ sourceUrl }) => useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' }
                }
            );

            // Set volume and connect presentation
            act(() => {
                result.current.controls.setVolume(0.8);
                const callback = (global as any).__videoSyncConnectionCallback;
                if (callback) callback(true);
            });

            // Change video source
            mockVideoElement.src = '';
            rerender({ sourceUrl: 'video2.mp4' });

            // Wait for effect to run
            act(() => {});

            // Clear previous calls
            mockSendCommand.mockClear();

            // Mark presentation as ready
            act(() => {
                const callback = (global as any).__videoSyncVideoReadyCallback;
                if (callback) callback(true);
            });

            // Play after transition
            await act(async () => {
                await result.current.controls.play();
            });

            // Verify play command includes current volume
            expect(mockSendCommand).toHaveBeenCalledWith('play', {
                time: expect.any(Number),
                volume: 0.8,
                muted: false
            });
        });
    });
});