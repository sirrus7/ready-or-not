import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Create inline mocks
const mockSendCommand = vi.fn();
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
        setPresentationReady: vi.fn(),
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

describe('Debug - useSimpleVideoSync', () => {
    let mockVideoElement: any;

    beforeEach(() => {
        vi.clearAllMocks();
        connectionCallback = null;
        videoReadyCallback = null;
        
        // Create mock video element
        mockVideoElement = {
            play: vi.fn().mockResolvedValue(undefined),
            pause: vi.fn(),
            addEventListener: vi.fn((event, handler) => {
                console.log('addEventListener called:', event);
            }),
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
    });

    it('should debug event listeners', () => {
        const { result } = renderHook(() => useSimpleVideoSync({
            sessionId: 'test-session',
            sourceUrl: 'test.mp4',
            isEnabled: true
        }));

        // Log all addEventListener calls
        console.log('addEventListener calls:', mockVideoElement.addEventListener.mock.calls.map(call => call[0]));

        // Find canplay handler
        const canplayCall = mockVideoElement.addEventListener.mock.calls.find(call => call[0] === 'canplay');
        console.log('canplay handler exists:', !!canplayCall);

        if (canplayCall && canplayCall[1]) {
            // Call the handler
            act(() => {
                canplayCall[1]();
            });

            console.log('hostReady after canplay:', result.current.state.hostReady);
        }

        // Check all registered events
        const events = mockVideoElement.addEventListener.mock.calls.map(call => call[0]);
        expect(events).toContain('canplay');
        expect(events).toContain('play');
        expect(events).toContain('pause');
        expect(events).toContain('timeupdate');
    });

    it('should debug state updates in connection callback', () => {
        const { result } = renderHook(() => useSimpleVideoSync({
            sessionId: 'test-session',
            sourceUrl: 'test.mp4',
            isEnabled: true
        }));

        console.log('Initial state:', result.current.state);
        console.log('connectionCallback exists:', !!connectionCallback);

        // Update presentation ready first
        act(() => {
            if (videoReadyCallback) {
                console.log('Calling videoReadyCallback(true)');
                videoReadyCallback(true);
            }
        });

        console.log('State after videoReady:', result.current.state);

        // Then disconnect
        act(() => {
            if (connectionCallback) {
                console.log('Calling connectionCallback(false)');
                connectionCallback(false);
            }
        });

        console.log('State after disconnect:', result.current.state);
        
        // The implementation should clear presentationReady on disconnect
        expect(result.current.state.presentationConnected).toBe(false);
        // This is failing - let's see why
        console.log('presentationReady after disconnect:', result.current.state.presentationReady);
    });
});