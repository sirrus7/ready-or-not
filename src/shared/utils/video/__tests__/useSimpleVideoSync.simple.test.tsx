import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

// First, let's set up all mocks before any imports
const mockSendCommand = vi.fn();
const mockOnConnectionChange = vi.fn();
const mockOnVideoReady = vi.fn();
const mockSetPresentationReady = vi.fn();

// Mock the hook before importing
vi.mock('@shared/hooks/useVideoSyncManager', () => {
    return {
        useVideoSyncManager: vi.fn(() => ({
            sendCommand: mockSendCommand,
            isConnected: false,
            onConnectionChange: mockOnConnectionChange,
            onVideoReady: mockOnVideoReady,
            setPresentationReady: mockSetPresentationReady
        }))
    };
});

// Mock video logger
vi.mock('../videoLogger', () => ({
    videoSyncLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Now import the hook we're testing
import { useSimpleVideoSync } from '../useSimpleVideoSync';

describe('useSimpleVideoSync - Simple Tests', () => {
    let mockVideoElement: any;
    let connectionChangeCallback: ((connected: boolean) => void) | null = null;
    let videoReadyCallback: ((ready: boolean) => void) | null = null;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create mock video element
        mockVideoElement = {
            play: vi.fn().mockResolvedValue(undefined),
            pause: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            readyState: 4, // HAVE_ENOUGH_DATA
            currentTime: 0,
            duration: 100,
            paused: true,
            volume: 1,
            muted: false,
            src: '',
            load: vi.fn()
        };

        // Mock React.useRef to return our video element
        vi.spyOn(React, 'useRef').mockReturnValue({ current: mockVideoElement });

        // Capture callbacks when they're registered
        mockOnConnectionChange.mockImplementation((cb) => {
            connectionChangeCallback = cb;
            return () => { connectionChangeCallback = null; };
        });

        mockOnVideoReady.mockImplementation((cb) => {
            videoReadyCallback = cb;
            return () => { videoReadyCallback = null; };
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        connectionChangeCallback = null;
        videoReadyCallback = null;
    });

    describe('Volume Control', () => {
        it('should apply volume to host when not connected to presentation', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            act(() => {
                result.current.controls.setVolume(0.5);
            });

            expect(mockVideoElement.volume).toBe(0.5);
            expect(result.current.state.volume).toBe(0.5);
        });

        it('should send volume command when connected to presentation', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Simulate presentation connection
            act(() => {
                if (connectionChangeCallback) {
                    connectionChangeCallback(true);
                }
            });

            // Clear previous calls
            mockSendCommand.mockClear();

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.7);
            });

            expect(mockSendCommand).toHaveBeenCalledWith('volume', { volume: 0.7 });
            expect(result.current.state.volume).toBe(0.7);
        });
    });

    describe('Connection Behavior', () => {
        it('should pause video when presentation connects', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',  
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Start with video playing
            mockVideoElement.paused = false;

            act(() => {
                if (connectionChangeCallback) {
                    connectionChangeCallback(true);
                }
            });

            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(true);
        });

        it('should pause video and reset presentation state when disconnects', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // First connect and mark presentation ready
            act(() => {
                if (connectionChangeCallback) {
                    connectionChangeCallback(true);
                }
                if (videoReadyCallback) {
                    videoReadyCallback(true);
                }
            });

            expect(result.current.state.presentationConnected).toBe(true);
            expect(result.current.state.presentationReady).toBe(true);

            // Start playing
            mockVideoElement.paused = false;
            
            // Clear pause calls
            mockVideoElement.pause.mockClear();

            // Now disconnect
            act(() => {
                if (connectionChangeCallback) {
                    connectionChangeCallback(false);
                }
            });

            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(false);
            expect(result.current.state.presentationReady).toBe(false);
        });
    });

    describe('Play/Pause with Both Videos', () => {
        it('should wait for both videos before playing', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Connect presentation but not ready
            act(() => {
                if (connectionChangeCallback) {
                    connectionChangeCallback(true);
                }
            });

            // Try to play
            await act(async () => {
                await result.current.controls.play();
            });

            // Should not play yet
            expect(mockVideoElement.play).not.toHaveBeenCalled();
            expect(result.current.state.isPlaying).toBe(false);

            // Now presentation becomes ready
            act(() => {
                if (videoReadyCallback) {
                    videoReadyCallback(true);
                }
            });

            // Try to play again
            await act(async () => {
                await result.current.controls.play();
            });

            // Now should play
            expect(mockVideoElement.play).toHaveBeenCalled();
            expect(mockSendCommand).toHaveBeenCalledWith('play', expect.objectContaining({
                time: expect.any(Number),
                volume: expect.any(Number),
                muted: expect.any(Boolean)
            }));
        });
    });

    describe('Audio Target', () => {
        it('should mute host when presentation is connected', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Initially host should not be muted
            expect(mockVideoElement.muted).toBe(false);
            expect(result.current.audioTarget).toBe('host');

            // Connect presentation
            act(() => {
                if (connectionChangeCallback) {
                    connectionChangeCallback(true);
                }
            });

            // Host should now be muted
            expect(mockVideoElement.muted).toBe(true);
            expect(result.current.audioTarget).toBe('presentation');

            // Disconnect presentation
            act(() => {
                if (connectionChangeCallback) {
                    connectionChangeCallback(false);
                }
            });

            // Host should be unmuted again
            expect(mockVideoElement.muted).toBe(false);
            expect(result.current.audioTarget).toBe('host');
        });
    });
});