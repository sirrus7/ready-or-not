import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Mock these modules
vi.mock('@shared/hooks/useVideoSyncManager');
vi.mock('../videoLogger');

// Import after mocking
import { useSimpleVideoSync } from '../useSimpleVideoSync';
import { 
    useVideoSyncManager, 
    mockSendCommand,
    mockOnConnectionChange,
    mockOnVideoReady
} from '@shared/hooks/useVideoSyncManager';

describe('useSimpleVideoSync - Correct Implementation Tests', () => {
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

        // Setup mock implementations that capture callbacks
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

    describe('Volume Control', () => {
        it('should update state volume and apply to video when not connected', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.5);
            });

            // State should update immediately
            expect(result.current.state.volume).toBe(0.5);
            
            // Volume should be applied via effect
            await waitFor(() => {
                expect(mockVideoElement.volume).toBe(0.5);
            });
        });

        it('should send volume command when presentation is connected', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Connect presentation first
            act(() => {
                if (connectionChangeCallback) connectionChangeCallback(true);
            });

            // Wait for state to update
            await waitFor(() => {
                expect(result.current.state.presentationConnected).toBe(true);
            });

            // Clear previous calls
            mockSendCommand.mockClear();

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.7);
            });

            // Command should be sent
            expect(mockSendCommand).toHaveBeenCalledWith('volume', { volume: 0.7 });
            expect(result.current.state.volume).toBe(0.7);
        });
    });

    describe('Connection Behavior', () => {
        it('should pause video when presentation connects', async () => {
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
                if (connectionChangeCallback) connectionChangeCallback(true);
            });

            // Should pause immediately in the connection handler
            await waitFor(() => {
                expect(mockVideoElement.pause).toHaveBeenCalled();
            });
        });

        it('should pause and reset presentation state on disconnect', async () => {
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

            await waitFor(() => {
                expect(result.current.state.presentationConnected).toBe(true);
                expect(result.current.state.presentationReady).toBe(true);
            });

            // Video playing
            mockVideoElement.paused = false;
            mockVideoElement.pause.mockClear();

            // Disconnect
            act(() => {
                if (connectionChangeCallback) connectionChangeCallback(false);
            });

            // Should pause and reset
            await waitFor(() => {
                expect(mockVideoElement.pause).toHaveBeenCalled();
                expect(result.current.state.presentationConnected).toBe(false);
                expect(result.current.state.presentationReady).toBe(false);
            });
        });
    });

    describe('Play Control', () => {
        it('should play when only host is ready', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Mark host ready via canplay event
            act(() => {
                const canplayHandler = mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'canplay')?.[1];
                if (canplayHandler) canplayHandler();
            });

            await waitFor(() => {
                expect(result.current.state.hostReady).toBe(true);
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

            // Connect presentation
            act(() => {
                if (connectionChangeCallback) connectionChangeCallback(true);
            });

            await waitFor(() => {
                expect(result.current.state.hostReady).toBe(true);
                expect(result.current.state.presentationConnected).toBe(true);
            });

            // Try to play - should not work yet
            await act(async () => {
                await result.current.controls.play();
            });

            expect(mockVideoElement.play).not.toHaveBeenCalled();

            // Presentation ready
            act(() => {
                if (videoReadyCallback) videoReadyCallback(true);
            });

            await waitFor(() => {
                expect(result.current.state.presentationReady).toBe(true);
            });

            // Now play should work
            await act(async () => {
                await result.current.controls.play();
            });

            expect(mockVideoElement.play).toHaveBeenCalled();
            expect(mockSendCommand).toHaveBeenCalledWith('play', expect.objectContaining({
                time: expect.any(Number),
                volume: expect.any(Number),
                muted: expect.any(Boolean)
            }));
        });
    });

    describe('Audio Routing', () => {
        it('should mute host when presentation connected', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Initially not muted
            expect(result.current.audioTarget).toBe('host');
            expect(mockVideoElement.muted).toBe(false);

            // Connect presentation
            act(() => {
                if (connectionChangeCallback) connectionChangeCallback(true);
            });

            // Should mute host via effect
            await waitFor(() => {
                expect(mockVideoElement.muted).toBe(true);
                expect(result.current.audioTarget).toBe('presentation');
            });

            // Disconnect
            act(() => {
                if (connectionChangeCallback) connectionChangeCallback(false);
            });

            // Should unmute via effect
            await waitFor(() => {
                expect(mockVideoElement.muted).toBe(false);
                expect(result.current.audioTarget).toBe('host');
            });
        });
    });

    describe('Source Changes', () => {
        it('should reload video when source changes', async () => {
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

            // Change source
            rerender({ sourceUrl: 'video2.mp4' });

            // Should reload via effect
            await waitFor(() => {
                expect(mockVideoElement.load).toHaveBeenCalled();
            });
        });

        it('should maintain volume across source changes', async () => {
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

            await waitFor(() => {
                expect(mockVideoElement.volume).toBe(0.3);
            });

            // Change source
            rerender({ sourceUrl: 'video2.mp4' });

            // Volume should persist in state and be reapplied
            expect(result.current.state.volume).toBe(0.3);
            
            await waitFor(() => {
                expect(mockVideoElement.volume).toBe(0.3);
            });
        });
    });

    describe('Playback State', () => {
        it('should track play/pause state via events', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Initially not playing
            expect(result.current.state.isPlaying).toBe(false);

            // Trigger play event
            act(() => {
                const playHandler = mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'play')?.[1];
                if (playHandler) playHandler();
            });

            await waitFor(() => {
                expect(result.current.state.isPlaying).toBe(true);
            });

            // Trigger pause event
            act(() => {
                const pauseHandler = mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'pause')?.[1];
                if (pauseHandler) pauseHandler();
            });

            await waitFor(() => {
                expect(result.current.state.isPlaying).toBe(false);
            });
        });
    });
});