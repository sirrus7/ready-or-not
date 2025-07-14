import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { useSimpleVideoSync } from '../useSimpleVideoSync';

// Mock dependencies
const mockSendCommand = vi.fn();
const mockOnConnectionChange = vi.fn();
const mockSetPresentationReady = vi.fn();
const mockOnVideoReady = vi.fn();

vi.mock('@shared/hooks/useVideoSyncManager', () => ({
    useVideoSyncManager: () => ({
        sendCommand: mockSendCommand,
        isConnected: false,
        onConnectionChange: mockOnConnectionChange.mockImplementation((callback) => {
            // Store the callback for testing
            (global as any).__connectionCallback = callback;
            return () => {};
        }),
        onVideoReady: mockOnVideoReady.mockImplementation((callback) => {
            // Store the callback for testing
            (global as any).__videoReadyCallback = callback;
            return () => {};
        }),
        setPresentationReady: mockSetPresentationReady
    })
}));

describe('useSimpleVideoSync', () => {
    let mockVideoElement: any;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();
        
        // Create fresh mock video element
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
            src: '',
            load: vi.fn()
        };

        // Mock useRef to return our video element
        vi.spyOn(React, 'useRef').mockReturnValue({ current: mockVideoElement });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('volume control', () => {
        it('should apply volume changes to host video when presentation is not connected', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

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

            // Simulate presentation connected by calling the connection callback
            act(() => {
                if ((global as any).__connectionCallback) {
                    (global as any).__connectionCallback(true);
                }
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
                if ((global as any).__connectionCallback) {
                    (global as any).__connectionCallback(true);
                }
            });

            // Should now target presentation
            expect(result.current.audioTarget).toBe('presentation');
        });
    });

    describe('connection behavior', () => {
        it('should not pause video when presentation connects', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Start playing the video
            mockVideoElement.paused = false;
            await act(async () => {
                await result.current.controls.play();
            });

            // Clear any previous calls
            mockVideoElement.pause.mockClear();

            // Simulate presentation connecting
            act(() => {
                if ((global as any).__connectionCallback) {
                    (global as any).__connectionCallback(true);
                }
            });

            // Verify video was NOT paused
            expect(mockVideoElement.pause).not.toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(true);
        });

        it('should not pause video when presentation disconnects', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // First connect presentation
            act(() => {
                if ((global as any).__connectionCallback) {
                    (global as any).__connectionCallback(true);
                }
            });

            // Start playing the video
            mockVideoElement.paused = false;
            act(async () => {
                await result.current.controls.play();
            });

            // Clear any previous calls
            mockVideoElement.pause.mockClear();

            // Simulate presentation disconnecting
            act(() => {
                if ((global as any).__connectionCallback) {
                    (global as any).__connectionCallback(false);
                }
            });

            // Verify video was NOT paused
            expect(mockVideoElement.pause).not.toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(false);
            expect(result.current.state.presentationReady).toBe(false);
        });

        it('should maintain playback state through connection changes', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Start playing
            mockVideoElement.paused = false;
            act(async () => {
                await result.current.controls.play();
            });

            expect(result.current.state.isPlaying).toBe(true);

            // Connect presentation
            act(() => {
                if ((global as any).__connectionCallback) {
                    (global as any).__connectionCallback(true);
                }
            });

            // State should still be playing
            expect(result.current.state.isPlaying).toBe(true);

            // Disconnect presentation
            act(() => {
                if ((global as any).__connectionCallback) {
                    (global as any).__connectionCallback(false);
                }
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

            // Mock video element for source change
            mockVideoElement.src = '';

            // Change video source (simulating slide transition)
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

            // Mock video element for source change
            mockVideoElement.src = '';

            // Change video source
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
                if ((global as any).__connectionCallback) {
                    (global as any).__connectionCallback(true);
                }
            });

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.7);
            });

            // Mock video element for source change
            mockVideoElement.src = '';

            // Change video source
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
                if ((global as any).__connectionCallback) {
                    (global as any).__connectionCallback(true);
                }
            });

            // Mock video element for source change
            mockVideoElement.src = '';

            // Change video source
            rerender({ sourceUrl: 'video2.mp4' });

            // Wait for effect to run
            act(() => {});

            // Clear previous calls
            mockSendCommand.mockClear();

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