import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Create inline mocks
const mockSendCommand = vi.fn();
const mockSetPresentationReady = vi.fn();
let connectionCallback: ((connected: boolean) => void) | null = null;
let videoReadyCallback: ((ready: boolean) => void) | null = null;

// Mock the hook inline
vi.mock('@shared/hooks/useVideoSyncManager', () => ({
    useVideoSyncManager: vi.fn(() => ({
        sendCommand: mockSendCommand,
        isConnected: false,
        onConnectionChange: vi.fn((cb) => {
            connectionCallback = cb;
            return () => { connectionCallback = null; };
        }),
        onVideoReady: vi.fn((cb) => {
            videoReadyCallback = cb;
            return () => { videoReadyCallback = null; };
        }),
        setPresentationReady: mockSetPresentationReady,
        sendVideoReady: vi.fn(),
        onCommand: vi.fn()
    }))
}));

// Mock logger
vi.mock('../videoLogger', () => ({
    videoSyncLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Import after mocking
import { useSimpleVideoSync } from '../useSimpleVideoSync';

describe('useSimpleVideoSync', () => {
    let mockVideoElement: any;
    let mockVideoRef: any;

    beforeEach(() => {
        vi.clearAllMocks();
        connectionCallback = null;
        videoReadyCallback = null;
        
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

        // Create a stable ref object
        mockVideoRef = { current: mockVideoElement };

        // Mock React.useRef to return the same ref object
        vi.spyOn(React, 'useRef').mockReturnValue(mockVideoRef);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('volume control', () => {
        it('should update volume state when setVolume is called', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.5);
            });

            // State should update immediately
            expect(result.current.state.volume).toBe(0.5);
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
                if (connectionCallback) {
                    connectionCallback(true);
                }
            });

            // Should now target presentation
            expect(result.current.audioTarget).toBe('presentation');
        });
    });

    describe('connection behavior', () => {
        it('should track presentation connection state', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Initially not connected
            expect(result.current.state.presentationConnected).toBe(false);

            // Connect
            act(() => {
                if (connectionCallback) connectionCallback(true);
            });

            expect(result.current.state.presentationConnected).toBe(true);

            // Disconnect
            act(() => {
                if (connectionCallback) connectionCallback(false);
            });

            expect(result.current.state.presentationConnected).toBe(false);
        });

        it('should track presentation ready state', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Initially not ready
            expect(result.current.state.presentationReady).toBe(false);

            // Mark ready
            act(() => {
                if (videoReadyCallback) videoReadyCallback(true);
            });

            expect(result.current.state.presentationReady).toBe(true);

            // Mark not ready
            act(() => {
                if (videoReadyCallback) videoReadyCallback(false);
            });

            expect(result.current.state.presentationReady).toBe(false);
        });
    });

    describe('volume persistence during slide transitions', () => {
        it('should maintain volume state when source changes', () => {
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
            
            expect(result.current.state.volume).toBe(0.6);

            // Change video source
            rerender({ sourceUrl: 'video2.mp4' });

            // Volume state should persist
            expect(result.current.state.volume).toBe(0.6);
        });

        it('should maintain mute state when source changes', () => {
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
            rerender({ sourceUrl: 'video2.mp4' });

            // Mute state should persist
            expect(result.current.state.isMuted).toBe(true);
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
                rerender({ sourceUrl: video });
                expect(result.current.state.volume).toBe(0.4);
            });
        });
    });
});