import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePresentationVideo } from '../usePresentationVideo';

// Mock the logger
vi.mock('../videoLogger', () => ({
    presentationVideoLogger: {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn()
    }
}));

// Mock the broadcast channel
const mockPostMessage = vi.fn();
const mockClose = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

global.BroadcastChannel = vi.fn().mockImplementation(() => ({
    postMessage: mockPostMessage,
    close: mockClose,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener
})) as any;

describe('usePresentationVideo', () => {
    let mockVideoElement: Partial<HTMLVideoElement>;
    let commandHandlers: Map<string, Function>;

    beforeEach(() => {
        // Mock video element
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
            load: vi.fn(),
            error: null
        };

        // Track command handlers
        commandHandlers = new Map();
        mockAddEventListener.mockImplementation((event: string, handler: Function) => {
            if (event === 'message') {
                commandHandlers.set('message', handler);
            }
        });

        // Mock ref using React import
        const React = require('react');
        vi.spyOn(React, 'useRef').mockReturnValue({
            current: mockVideoElement as HTMLVideoElement
        });

        // Clear mocks
        mockPostMessage.mockClear();
        mockClose.mockClear();
        mockAddEventListener.mockClear();
        mockRemoveEventListener.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const simulateCommand = (command: { action: string; data?: any }) => {
        const handler = commandHandlers.get('message');
        if (handler) {
            handler({
                data: {
                    type: 'host-command',
                    command
                }
            });
        }
    };

    describe('volume persistence during slide transitions', () => {
        it('should persist volume when video source changes', () => {
            const { result, rerender } = renderHook(
                ({ sourceUrl }) => usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' }
                }
            );

            // Set volume through command
            act(() => {
                simulateCommand({ action: 'volume', data: { volume: 0.5 } });
            });

            expect(result.current.state.volume).toBe(0.5);
            expect(mockVideoElement.volume).toBe(0.5);

            // Mock video element for source change
            mockVideoElement.src = '';

            // Change video source (simulating slide transition)
            rerender({ sourceUrl: 'video2.mp4' });

            // Verify volume was applied to the new video
            expect(mockVideoElement.load).toHaveBeenCalled();
            expect(mockVideoElement.volume).toBe(0.5);
        });

        it('should persist mute state when video source changes', () => {
            const { result, rerender } = renderHook(
                ({ sourceUrl }) => usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' }
                }
            );

            // Set mute through command
            act(() => {
                simulateCommand({ action: 'volume', data: { muted: true } });
            });

            expect(result.current.state.isMuted).toBe(true);
            expect(mockVideoElement.muted).toBe(true);

            // Mock video element for source change
            mockVideoElement.src = '';

            // Change video source
            rerender({ sourceUrl: 'video2.mp4' });

            // Verify mute state was applied to the new video
            expect(mockVideoElement.muted).toBe(true);
        });

        it('should apply both volume and mute state from play command', async () => {
            const { result } = renderHook(() => usePresentationVideo({
                sessionId: 'test-session',
                sourceUrl: 'video1.mp4',
                isEnabled: true
            }));

            // Mark video as ready
            mockVideoElement.readyState = 4;
            act(() => {
                const canPlayHandler = (mockVideoElement.addEventListener as ReturnType<typeof vi.fn>).mock.calls
                    .find(call => call[0] === 'canplay')?.[1];
                canPlayHandler?.();
            });

            // Send play command with volume settings
            await act(async () => {
                simulateCommand({ 
                    action: 'play', 
                    data: { 
                        time: 10,
                        volume: 0.7,
                        muted: false
                    }
                });
            });

            // Verify all settings were applied
            expect(mockVideoElement.currentTime).toBe(10);
            expect(mockVideoElement.volume).toBe(0.7);
            expect(mockVideoElement.muted).toBe(false);
            expect(mockVideoElement.play).toHaveBeenCalled();
            expect(result.current.state.volume).toBe(0.7);
            expect(result.current.state.isMuted).toBe(false);
        });

        it('should handle volume commands even when video is not ready', () => {
            const { result } = renderHook(() => usePresentationVideo({
                sessionId: 'test-session',
                sourceUrl: 'video1.mp4',
                isEnabled: true
            }));

            // Video is not ready (readyState = 0)
            expect(mockVideoElement.readyState).toBe(0);
            expect(result.current.state.isReady).toBe(false);

            // Volume commands should still work
            act(() => {
                simulateCommand({ action: 'volume', data: { volume: 0.3 } });
            });

            expect(mockVideoElement.volume).toBe(0.3);
            expect(result.current.state.volume).toBe(0.3);
        });

        it('should handle rapid volume changes during transitions', () => {
            const { rerender } = renderHook(
                ({ sourceUrl }) => usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' }
                }
            );

            // Rapid volume changes
            const volumeChanges = [0.2, 0.4, 0.6, 0.8, 1.0];
            volumeChanges.forEach(volume => {
                act(() => {
                    simulateCommand({ action: 'volume', data: { volume } });
                });
                expect(mockVideoElement.volume).toBe(volume);
            });

            // Change source
            mockVideoElement.src = '';
            rerender({ sourceUrl: 'video2.mp4' });

            // Last volume should persist
            expect(mockVideoElement.volume).toBe(1.0);
        });

        it('should log volume settings when applied to new video', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const { rerender } = renderHook(
                ({ sourceUrl }) => usePresentationVideo({
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
                simulateCommand({ action: 'volume', data: { volume: 0.6, muted: true } });
            });

            // Change source
            mockVideoElement.src = '';
            rerender({ sourceUrl: 'video2.mp4' });

            // Verify logging
            expect(consoleSpy).toHaveBeenCalledWith(
                '[Presentation] Applied volume settings to new video:',
                { volume: 0.6, muted: true }
            );

            consoleSpy.mockRestore();
        });

        it('should send ready status false during transition and true when ready', () => {
            const { rerender } = renderHook(
                ({ sourceUrl }) => usePresentationVideo({
                    sessionId: 'test-session',
                    sourceUrl,
                    isEnabled: true
                }),
                {
                    initialProps: { sourceUrl: 'video1.mp4' }
                }
            );

            // Clear initial calls
            mockPostMessage.mockClear();

            // Change source
            mockVideoElement.src = '';
            rerender({ sourceUrl: 'video2.mp4' });

            // Should send not ready
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: 'presentation-ready',
                isReady: false
            });

            // Clear for next assertion
            mockPostMessage.mockClear();

            // Simulate video ready
            mockVideoElement.readyState = 4;
            act(() => {
                const canPlayHandler = (mockVideoElement.addEventListener as ReturnType<typeof vi.fn>).mock.calls
                    .find(call => call[0] === 'canplay')?.[1];
                canPlayHandler?.();
            });

            // Should send ready
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: 'presentation-ready',
                isReady: true
            });
        });

        it('should maintain volume state consistency across multiple operations', () => {
            const { result, rerender } = renderHook(
                ({ sourceUrl }) => usePresentationVideo({
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
                simulateCommand({ action: 'volume', data: { volume: 0.5 } });
            });

            // Change source
            mockVideoElement.src = '';
            rerender({ sourceUrl: 'video2.mp4' });

            // Volume persists
            expect(mockVideoElement.volume).toBe(0.5);

            // Update volume after transition
            act(() => {
                simulateCommand({ action: 'volume', data: { volume: 0.8 } });
            });

            // Change source again
            mockVideoElement.src = '';
            rerender({ sourceUrl: 'video3.mp4' });

            // New volume persists
            expect(mockVideoElement.volume).toBe(0.8);
            expect(result.current.state.volume).toBe(0.8);
        });
    });

    describe('getVideoProps', () => {
        it('should return props with current mute state', () => {
            const { result } = renderHook(() => usePresentationVideo({
                sessionId: 'test-session',
                sourceUrl: 'video1.mp4',
                isEnabled: true
            }));

            // Initial state
            let props = result.current.getVideoProps();
            expect(props.muted).toBe(false);

            // After muting
            act(() => {
                simulateCommand({ action: 'volume', data: { muted: true } });
            });

            props = result.current.getVideoProps();
            expect(props.muted).toBe(true);
        });
    });
});