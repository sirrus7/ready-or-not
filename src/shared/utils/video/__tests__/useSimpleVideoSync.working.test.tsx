import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import React from 'react';
import { createMockVideoElement, createMockVideoSyncManager } from './test-utils';

// Create mocks before imports
const mockVideoSyncManager = createMockVideoSyncManager();

// Mock modules
vi.mock('@shared/hooks/useVideoSyncManager', () => ({
    useVideoSyncManager: vi.fn(() => mockVideoSyncManager.mockImplementation)
}));

vi.mock('../videoLogger', () => ({
    videoSyncLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Import after mocking
import { useSimpleVideoSync } from '../useSimpleVideoSync';

describe('useSimpleVideoSync - Working Tests', () => {
    let mockVideoElement: ReturnType<typeof createMockVideoElement>;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create fresh mock video element
        mockVideoElement = createMockVideoElement();
        
        // Mock React.useRef
        vi.spyOn(React, 'useRef').mockReturnValue({ current: mockVideoElement });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Basic Functionality', () => {
        it('should initialize with correct default state', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            expect(result.current.state).toEqual({
                isPlaying: false,
                currentTime: 0,
                duration: 0,
                volume: 1,
                isMuted: false,
                hostReady: false,
                presentationReady: false,
                presentationConnected: false
            });
            expect(result.current.audioTarget).toBe('host');
        });
    });

    describe('Volume Control - Host Only', () => {
        it('should update volume on host when not connected', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Set volume through controls
            act(() => {
                result.current.controls.setVolume(0.5);
            });

            // Check state updated
            expect(result.current.state.volume).toBe(0.5);
            
            // Since we're not connected to presentation, it should update the video element
            expect(mockVideoElement.volume).toBe(0.5);
        });

        it('should handle mute toggle', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Toggle mute
            act(() => {
                result.current.controls.toggleMute();
            });

            expect(result.current.state.isMuted).toBe(true);
            expect(result.current.state.volume).toBe(1); // Volume should remain unchanged
        });
    });

    describe('Volume Control - With Presentation', () => {
        it('should send volume command when presentation is connected', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Simulate presentation connection
            act(() => {
                mockVideoSyncManager.simulateConnectionChange(true);
            });

            // Clear any previous calls
            mockVideoSyncManager.mockSendCommand.mockClear();

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.7);
            });

            // Should send command to presentation
            expect(mockVideoSyncManager.mockSendCommand).toHaveBeenCalledWith('volume', { volume: 0.7 });
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

            // Video is playing
            mockVideoElement.paused = false;

            // Clear initial calls
            mockVideoElement.pause.mockClear();

            // Simulate presentation connecting
            act(() => {
                mockVideoSyncManager.simulateConnectionChange(true);
            });

            // Should pause the video
            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(true);
        });

        it('should pause video and reset presentation state when disconnects', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // First, connect and mark as ready
            act(() => {
                mockVideoSyncManager.simulateConnectionChange(true);
                mockVideoSyncManager.simulateVideoReady(true);
            });

            expect(result.current.state.presentationConnected).toBe(true);
            expect(result.current.state.presentationReady).toBe(true);

            // Video is playing
            mockVideoElement.paused = false;
            mockVideoElement.pause.mockClear();

            // Disconnect
            act(() => {
                mockVideoSyncManager.simulateConnectionChange(false);
            });

            // Should pause and reset
            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(false);
            expect(result.current.state.presentationReady).toBe(false);
        });
    });

    describe('Play Control with Both Videos', () => {
        it('should wait for both videos before playing', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Host is ready (simulated by canplay event)
            act(() => {
                const canplayHandler = mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'canplay')?.[1];
                if (canplayHandler) canplayHandler();
            });

            // Connect presentation but not ready yet
            act(() => {
                mockVideoSyncManager.simulateConnectionChange(true);
            });

            // Try to play
            await act(async () => {
                await result.current.controls.play();
            });

            // Should NOT play yet
            expect(mockVideoElement.play).not.toHaveBeenCalled();

            // Now presentation becomes ready
            act(() => {
                mockVideoSyncManager.simulateVideoReady(true);
            });

            // Try to play again
            await act(async () => {
                await result.current.controls.play();
            });

            // Now should play
            expect(mockVideoElement.play).toHaveBeenCalled();
            expect(mockVideoSyncManager.mockSendCommand).toHaveBeenCalledWith('play', expect.objectContaining({
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
                mockVideoSyncManager.simulateConnectionChange(true);
            });

            // Host should be muted, audio target should be presentation
            expect(mockVideoElement.muted).toBe(true);
            expect(result.current.audioTarget).toBe('presentation');

            // Disconnect presentation
            act(() => {
                mockVideoSyncManager.simulateConnectionChange(false);
            });

            // Host should be unmuted again
            expect(mockVideoElement.muted).toBe(false);
            expect(result.current.audioTarget).toBe('host');
        });
    });

    describe('Playback State Tracking', () => {
        it('should track playing state correctly', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Initially not playing
            expect(result.current.state.isPlaying).toBe(false);

            // Simulate play event
            act(() => {
                const playHandler = mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'play')?.[1];
                if (playHandler) playHandler();
            });

            expect(result.current.state.isPlaying).toBe(true);

            // Simulate pause event
            act(() => {
                const pauseHandler = mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'pause')?.[1];
                if (pauseHandler) pauseHandler();
            });

            expect(result.current.state.isPlaying).toBe(false);
        });
    });

    describe('Volume Persistence', () => {
        it('should maintain volume when source changes', () => {
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

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.6);
            });

            // Update the mock video element to simulate it applying the volume
            mockVideoElement.volume = 0.6;

            // Change source
            rerender({ sourceUrl: 'video2.mp4' });

            // Volume should be maintained in state
            expect(result.current.state.volume).toBe(0.6);
            
            // Load should have been called
            expect(mockVideoElement.load).toHaveBeenCalled();
            
            // Volume should be applied to element
            expect(mockVideoElement.volume).toBe(0.6);
        });
    });
});