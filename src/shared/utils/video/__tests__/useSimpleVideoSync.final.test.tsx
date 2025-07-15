import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import React from 'react';

// Tell vitest to auto-mock these modules
vi.mock('@shared/hooks/useVideoSyncManager');
vi.mock('../videoLogger');

// Now import - the modules will be mocked
import { useSimpleVideoSync } from '../useSimpleVideoSync';
import { 
    useVideoSyncManager, 
    mockSendCommand,
    mockOnConnectionChange,
    mockOnVideoReady,
    mockSetPresentationReady 
} from '@shared/hooks/useVideoSyncManager';

describe('useSimpleVideoSync - Final Tests', () => {
    let mockVideoElement: any;
    let connectionChangeCallback: ((connected: boolean) => void) | null = null;
    let videoReadyCallback: ((ready: boolean) => void) | null = null;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Reset callbacks
        connectionChangeCallback = null;
        videoReadyCallback = null;
        
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

        // Setup mock implementations
        mockOnConnectionChange.mockImplementation((callback) => {
            connectionChangeCallback = callback;
            return () => { connectionChangeCallback = null; };
        });

        mockOnVideoReady.mockImplementation((callback) => {
            videoReadyCallback = callback;
            return () => { videoReadyCallback = null; };
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Volume Management', () => {
        it('should apply volume to video element when not connected', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Wait for initial setup
            act(() => {});

            // Set volume
            act(() => {
                // Get the actual volume update handler
                const volumeUpdateHandler = mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'volumechange')?.[1];
                
                // Call setVolume
                result.current.controls.setVolume(0.5);
                
                // Manually trigger the volume change event if handler exists
                if (volumeUpdateHandler) {
                    mockVideoElement.volume = 0.5;
                    volumeUpdateHandler();
                }
            });

            // State should be updated
            expect(result.current.state.volume).toBe(0.5);
        });

        it('should send volume command when connected to presentation', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Connect presentation
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

            // Should send command
            expect(mockSendCommand).toHaveBeenCalledWith('volume', { volume: 0.7 });
            expect(result.current.state.volume).toBe(0.7);
        });
    });

    describe('Connection Behavior', () => {
        it('should pause when presentation connects', () => {
            renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',  
                isEnabled: true
            }));

            // Video is playing
            mockVideoElement.paused = false;
            mockVideoElement.pause.mockClear();

            // Connect presentation
            act(() => {
                if (connectionChangeCallback) {
                    connectionChangeCallback(true);
                }
            });

            // Should pause
            expect(mockVideoElement.pause).toHaveBeenCalled();
        });

        it('should pause and reset presentation state on disconnect', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Connect and mark ready
            act(() => {
                if (connectionChangeCallback) connectionChangeCallback(true);
                if (videoReadyCallback) videoReadyCallback(true);
            });

            expect(result.current.state.presentationConnected).toBe(true);
            expect(result.current.state.presentationReady).toBe(true);

            // Video playing
            mockVideoElement.paused = false;
            mockVideoElement.pause.mockClear();

            // Disconnect
            act(() => {
                if (connectionChangeCallback) connectionChangeCallback(false);
            });

            // Should pause and reset
            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(false);
            expect(result.current.state.presentationReady).toBe(false);
        });
    });

    describe('Play Control', () => {
        it('should play immediately when only host', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Mark host ready
            act(() => {
                const canplayHandler = mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'canplay')?.[1];
                if (canplayHandler) canplayHandler();
            });

            // Play
            await act(async () => {
                await result.current.controls.play();
            });

            expect(mockVideoElement.play).toHaveBeenCalled();
        });

        it('should wait for both videos when presentation connected', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Host ready
            act(() => {
                const canplayHandler = mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'canplay')?.[1];
                if (canplayHandler) canplayHandler();
            });

            // Connect presentation but not ready
            act(() => {
                if (connectionChangeCallback) connectionChangeCallback(true);
            });

            // Try to play
            await act(async () => {
                await result.current.controls.play();
            });

            // Should not play yet
            expect(mockVideoElement.play).not.toHaveBeenCalled();

            // Presentation ready
            act(() => {
                if (videoReadyCallback) videoReadyCallback(true);
            });

            // Try again
            await act(async () => {
                await result.current.controls.play();
            });

            // Now should play
            expect(mockVideoElement.play).toHaveBeenCalled();
            expect(mockSendCommand).toHaveBeenCalledWith('play', expect.any(Object));
        });
    });

    describe('Audio Routing', () => {
        it('should mute host when presentation connected', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Initially not muted
            expect(result.current.audioTarget).toBe('host');

            // Connect presentation  
            act(() => {
                if (connectionChangeCallback) connectionChangeCallback(true);
            });

            // Should mute host
            expect(mockVideoElement.muted).toBe(true);
            expect(result.current.audioTarget).toBe('presentation');

            // Disconnect
            act(() => {
                if (connectionChangeCallback) connectionChangeCallback(false);
            });

            // Should unmute
            expect(mockVideoElement.muted).toBe(false);
            expect(result.current.audioTarget).toBe('host');
        });
    });

    describe('Source Changes', () => {
        it('should reload video when source changes', () => {
            const { rerender } = renderHook(
                ({ sourceUrl }) => useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                { initialProps: { sourceUrl: 'video1.mp4' } }
            );

            // Clear initial calls
            mockVideoElement.load.mockClear();

            // Change source - simulate src being empty
            act(() => {
                mockVideoElement.src = '';
            });
            
            rerender({ sourceUrl: 'video2.mp4' });

            // Wait for effects
            act(() => {});

            // Should reload
            expect(mockVideoElement.load).toHaveBeenCalled();
        });

        it('should maintain volume across source changes', () => {
            const { result, rerender } = renderHook(
                ({ sourceUrl }) => useSimpleVideoSync({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                { initialProps: { sourceUrl: 'video1.mp4' } }
            );

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.3);
            });

            expect(result.current.state.volume).toBe(0.3);

            // Change source
            act(() => {
                mockVideoElement.src = '';
            });
            
            rerender({ sourceUrl: 'video2.mp4' });

            // Volume should persist
            expect(result.current.state.volume).toBe(0.3);
        });
    });
});