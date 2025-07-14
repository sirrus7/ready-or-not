import { renderHook, act } from '@testing-library/react';
import { useSimpleVideoSync } from '../useSimpleVideoSync';

// Mock the video sync manager
jest.mock('@shared/hooks/useVideoSyncManager', () => ({
    useVideoSyncManager: jest.fn(() => ({
        sendCommand: jest.fn(),
        onConnectionChange: jest.fn(() => () => {}),
        setPresentationReady: jest.fn()
    }))
}));

describe('useSimpleVideoSync', () => {
    let mockVideoElement: Partial<HTMLVideoElement>;
    let originalCreateElement: typeof document.createElement;

    beforeEach(() => {
        // Mock video element
        mockVideoElement = {
            play: jest.fn().mockResolvedValue(undefined),
            pause: jest.fn().mockResolvedValue(undefined),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            readyState: 4,
            currentTime: 0,
            duration: 100,
            paused: true,
            volume: 1,
            muted: false,
            src: ''
        };

        // Mock createElement to return our mock video element
        originalCreateElement = document.createElement;
        document.createElement = jest.fn((tagName: string) => {
            if (tagName === 'video') {
                return mockVideoElement as HTMLVideoElement;
            }
            return originalCreateElement.call(document, tagName);
        });

        // Mock ref
        jest.spyOn(require('react'), 'useRef').mockReturnValue({
            current: mockVideoElement as HTMLVideoElement
        });
    });

    afterEach(() => {
        document.createElement = originalCreateElement;
        jest.restoreAllMocks();
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
            expect(mockVideoElement.muted).toBe(false);
        });

        it('should send volume command to presentation when connected', () => {
            const mockSendCommand = jest.fn();
            jest.spyOn(require('@shared/hooks/useVideoSyncManager'), 'useVideoSyncManager').mockReturnValue({
                sendCommand: mockSendCommand,
                onConnectionChange: jest.fn(() => () => {}),
                setPresentationReady: jest.fn()
            });

            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Simulate presentation connected
            act(() => {
                result.current.state.presentationConnected = true;
            });

            // Set volume
            act(() => {
                result.current.controls.setVolume(0.7);
            });

            // Verify command was sent with only volume (not muted state)
            expect(mockSendCommand).toHaveBeenCalledWith('volume', { volume: 0.7 });
            expect(mockSendCommand).not.toHaveBeenCalledWith('volume', expect.objectContaining({ muted: expect.any(Boolean) }));
        });

        it('should not mute video when changing volume', () => {
            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Initial state should not be muted
            expect(result.current.state.isMuted).toBe(false);

            // Change volume multiple times
            act(() => {
                result.current.controls.setVolume(0.3);
            });
            expect(result.current.state.isMuted).toBe(false);

            act(() => {
                result.current.controls.setVolume(0.8);
            });
            expect(result.current.state.isMuted).toBe(false);

            act(() => {
                result.current.controls.setVolume(1);
            });
            expect(result.current.state.isMuted).toBe(false);
        });

        it('should toggle mute state independently of volume', () => {
            const mockSendCommand = jest.fn();
            jest.spyOn(require('@shared/hooks/useVideoSyncManager'), 'useVideoSyncManager').mockReturnValue({
                sendCommand: mockSendCommand,
                onConnectionChange: jest.fn(() => () => {}),
                setPresentationReady: jest.fn()
            });

            const { result } = renderHook(() => useSimpleVideoSync({
                sessionId: 'test-session',
                sourceUrl: 'test-video.mp4',
                isEnabled: true
            }));

            // Simulate presentation connected
            act(() => {
                result.current.state.presentationConnected = true;
            });

            // Toggle mute
            act(() => {
                result.current.controls.toggleMute();
            });

            // Verify mute command includes both volume and muted state
            expect(mockSendCommand).toHaveBeenCalledWith('volume', { volume: 1, muted: true });
            expect(result.current.state.isMuted).toBe(true);

            // Change volume while muted
            mockSendCommand.mockClear();
            act(() => {
                result.current.controls.setVolume(0.5);
            });

            // Verify volume command does not include muted state
            expect(mockSendCommand).toHaveBeenCalledWith('volume', { volume: 0.5 });
            expect(result.current.state.isMuted).toBe(true); // Should remain muted
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
                result.current.state.presentationConnected = true;
            });

            // Should now target presentation
            expect(result.current.audioTarget).toBe('presentation');
        });
    });
});