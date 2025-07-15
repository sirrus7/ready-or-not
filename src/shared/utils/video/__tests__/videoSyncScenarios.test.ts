import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useSimpleVideoSync } from '../useSimpleVideoSync';
import { useHostVideo } from '../useHostVideo';

// Mock dependencies
const mockUseVideoSyncManager = vi.fn();
vi.mock('@shared/hooks/useVideoSyncManager', () => ({
    useVideoSyncManager: mockUseVideoSyncManager
}));
vi.mock('../videoLogger', () => ({
    videoSyncLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    },
    hostVideoLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Import the mock to use it
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';

describe('Video Sync Complete Scenarios', () => {
    let mockVideoElement: any;
    let mockSendCommand: any;
    let mockOnConnectionChange: any;
    let mockOnVideoReady: any;
    let mockSetPresentationReady: any;
    let connectionCallback: (connected: boolean) => void;
    let videoReadyCallback: (ready: boolean) => void;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create mock video element
        mockVideoElement = {
            play: vi.fn().mockResolvedValue(undefined),
            pause: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            readyState: 0,
            currentTime: 0,
            duration: 100,
            paused: true,
            volume: 1,
            muted: false,
            src: '',
            load: vi.fn()
        };

        // Mock React.useRef
        vi.spyOn(React, 'useRef').mockReturnValue({ current: mockVideoElement });

        // Mock sync manager
        mockSendCommand = vi.fn();
        mockSetPresentationReady = vi.fn();
        mockOnConnectionChange = vi.fn((cb) => {
            connectionCallback = cb;
            return () => {};
        });
        mockOnVideoReady = vi.fn((cb) => {
            videoReadyCallback = cb;
            return () => {};
        });

        // Setup the mock before it's imported
        vi.mocked(useVideoSyncManager).mockReturnValue({
            sendCommand: mockSendCommand,
            isConnected: false,
            onConnectionChange: mockOnConnectionChange,
            onVideoReady: mockOnVideoReady,
            setPresentationReady: mockSetPresentationReady
        });
    });

    describe('1. Host window only - host has precedence and outputs volume', () => {
        it('should play audio from host when no presentation connected', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Set video as ready
            mockVideoElement.readyState = 4;
            act(() => {
                mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'canplay')?.[1]();
            });

            // Play video
            await act(async () => {
                await result.current.controls.play();
            });

            expect(mockVideoElement.play).toHaveBeenCalled();
            expect(mockVideoElement.muted).toBe(false);
            expect(result.current.audioTarget).toBe('host');
        });

        it('should apply volume changes to host when no presentation', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            act(() => {
                result.current.controls.setVolume(0.7);
            });

            expect(mockVideoElement.volume).toBe(0.7);
            expect(mockVideoElement.muted).toBe(false);
        });
    });

    describe('2. Presentation window opens while host is playing - video pauses', () => {
        it('should pause video when presentation connects during playback', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Set video as ready and playing
            mockVideoElement.readyState = 4;
            mockVideoElement.paused = false;
            
            // Clear any initial calls
            mockVideoElement.pause.mockClear();

            // Simulate presentation connecting
            act(() => {
                connectionCallback(true);
            });

            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(true);
        });
    });

    describe('3. Both windows open - wait for both videos before playing', () => {
        it('should not play until both videos are ready', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Host is ready, presentation connected but not ready
            mockVideoElement.readyState = 4;
            act(() => {
                mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'canplay')?.[1]();
                connectionCallback(true);
            });

            // Try to play
            await act(async () => {
                await result.current.controls.play();
            });

            // Should not play yet
            expect(mockVideoElement.play).not.toHaveBeenCalled();

            // Now presentation becomes ready
            act(() => {
                videoReadyCallback(true);
            });

            // Try to play again
            await act(async () => {
                await result.current.controls.play();
            });

            // Now it should play
            expect(mockVideoElement.play).toHaveBeenCalled();
            expect(mockSendCommand).toHaveBeenCalledWith('play', expect.objectContaining({
                time: expect.any(Number),
                volume: expect.any(Number),
                muted: expect.any(Boolean)
            }));
        });
    });

    describe('4. Presentation disconnects - pause and give host precedence', () => {
        it('should pause video when presentation disconnects', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Setup: presentation connected and playing
            mockVideoElement.readyState = 4;
            mockVideoElement.paused = false;
            act(() => {
                connectionCallback(true);
                videoReadyCallback(true);
            });

            // Clear previous calls
            mockVideoElement.pause.mockClear();

            // Disconnect presentation
            act(() => {
                connectionCallback(false);
            });

            expect(mockVideoElement.pause).toHaveBeenCalled();
            expect(result.current.state.presentationConnected).toBe(false);
            expect(result.current.state.presentationReady).toBe(false);
        });

        it('should restore host audio when presentation disconnects', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Connect presentation (host should be muted)
            act(() => {
                connectionCallback(true);
            });
            expect(mockVideoElement.muted).toBe(true);

            // Disconnect presentation (host should unmute)
            act(() => {
                connectionCallback(false);
            });
            expect(mockVideoElement.muted).toBe(false);
            expect(result.current.audioTarget).toBe('host');
        });
    });

    describe('5. Audio routing - presentation outputs when connected', () => {
        it('should mute host and route audio to presentation when connected', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Initially host has audio
            expect(mockVideoElement.muted).toBe(false);
            expect(result.current.audioTarget).toBe('host');

            // Connect presentation
            act(() => {
                connectionCallback(true);
            });

            // Host should be muted, audio target is presentation
            expect(mockVideoElement.muted).toBe(true);
            expect(result.current.audioTarget).toBe('presentation');
        });

        it('should send volume commands to presentation when connected', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Connect presentation
            act(() => {
                connectionCallback(true);
            });

            // Change volume
            act(() => {
                result.current.controls.setVolume(0.5);
            });

            // Should send to presentation, not apply to host
            expect(mockSendCommand).toHaveBeenCalledWith('volume', { volume: 0.5 });
            expect(mockVideoElement.volume).toBe(1); // Host volume unchanged
        });
    });

    describe('6. Autoplay scenarios', () => {
        it('should autoplay when only host is present', async () => {
            // Test autoplay using useHostVideo with mocked useSimpleVideoSync
            const mockControls = {
                play: vi.fn().mockResolvedValue(undefined),
                pause: vi.fn(),
                seek: vi.fn(),
                setVolume: vi.fn(),
                toggleMute: vi.fn()
            };

            const mockSyncHook = vi.fn(() => ({
                videoRef: { current: mockVideoElement },
                state: {
                    hostReady: true,
                    presentationReady: false,
                    presentationConnected: false,
                    isPlaying: false,
                    currentTime: 0,
                    duration: 0,
                    volume: 1,
                    isMuted: false
                },
                controls: mockControls,
                audioTarget: 'host'
            }));

            vi.doMock('../useSimpleVideoSync', () => ({
                useSimpleVideoSync: mockSyncHook
            }));

            const { useHostVideo } = await import('../useHostVideo');

            const { result } = renderHook(() => useHostVideo({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true,
                autoPlay: true
            }));

            // Should autoplay
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            expect(mockControls.play).toHaveBeenCalled();
            
            // Cleanup
            vi.doUnmock('../useSimpleVideoSync');
        });

        it('should wait for both videos before autoplaying when presentation connected', async () => {
            const mockControls = {
                play: vi.fn().mockResolvedValue(undefined),
                pause: vi.fn(),
                seek: vi.fn(),
                setVolume: vi.fn(),
                toggleMute: vi.fn()
            };

            let mockState = {
                hostReady: true,
                presentationReady: false,
                presentationConnected: true,
                isPlaying: false,
                currentTime: 0,
                duration: 0,
                volume: 1,
                isMuted: false
            };

            const mockSyncHook = vi.fn(() => ({
                videoRef: { current: mockVideoElement },
                state: mockState,
                controls: mockControls,
                audioTarget: 'presentation'
            }));

            vi.doMock('../useSimpleVideoSync', () => ({
                useSimpleVideoSync: mockSyncHook
            }));

            const { useHostVideo } = await import('../useHostVideo');

            const { rerender } = renderHook(() => useHostVideo({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true,
                autoPlay: true
            }));

            // Should not autoplay yet
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });
            expect(mockControls.play).not.toHaveBeenCalled();

            // Presentation becomes ready
            mockState.presentationReady = true;
            rerender();

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            // Now should autoplay
            expect(mockControls.play).toHaveBeenCalled();
            
            // Cleanup
            vi.doUnmock('../useSimpleVideoSync');
        });
    });

    describe('7. Video sync during playback', () => {
        it('should sync time periodically when playing with presentation', async () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test.mp4',
                isEnabled: true
            }));

            // Setup both videos ready
            mockVideoElement.readyState = 4;
            mockVideoElement.paused = false;
            act(() => {
                connectionCallback(true);
                videoReadyCallback(true);
                mockVideoElement.addEventListener.mock.calls
                    .find(call => call[0] === 'play')?.[1]();
            });

            // Wait for sync interval
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 1100));
            });

            // Should have sent sync command
            expect(mockSendCommand).toHaveBeenCalledWith('sync', expect.objectContaining({
                time: expect.any(Number)
            }));
        });
    });
});