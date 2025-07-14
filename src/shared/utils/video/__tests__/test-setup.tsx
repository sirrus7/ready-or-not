import React from 'react';
import { vi } from 'vitest';

// Mock useVideoSyncManager globally
vi.mock('@shared/hooks/useVideoSyncManager', () => ({
    useVideoSyncManager: () => ({
        sendCommand: vi.fn(),
        onConnectionChange: vi.fn((callback: (connected: boolean) => void) => {
            // Return unsubscribe function
            return () => {};
        }),
        setPresentationReady: vi.fn()
    })
}));

// Mock React.useRef to return our mock video element
export const createMockVideoElement = () => {
    const mockVideoElement: Partial<HTMLVideoElement> = {
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
    
    return mockVideoElement;
};

export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
};