import { vi } from 'vitest';

// Create mock video element factory
export const createMockVideoElement = () => ({
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
});

// Create mock video sync manager
export const createMockVideoSyncManager = () => {
    const mockSendCommand = vi.fn();
    const mockSetPresentationReady = vi.fn();
    const mockSendVideoReady = vi.fn();
    
    let connectionCallback: ((connected: boolean) => void) | null = null;
    let videoReadyCallback: ((ready: boolean) => void) | null = null;
    let commandCallback: ((command: any) => void) | null = null;
    
    return {
        mockSendCommand,
        mockSetPresentationReady,
        mockSendVideoReady,
        connectionCallback: () => connectionCallback,
        videoReadyCallback: () => videoReadyCallback,
        commandCallback: () => commandCallback,
        mockImplementation: {
            sendCommand: mockSendCommand,
            isConnected: false,
            onConnectionChange: vi.fn((callback) => {
                connectionCallback = callback;
                return () => { connectionCallback = null; };
            }),
            onVideoReady: vi.fn((callback) => {
                videoReadyCallback = callback;
                return () => { videoReadyCallback = null; };
            }),
            setPresentationReady: mockSetPresentationReady,
            sendVideoReady: mockSendVideoReady,
            onCommand: vi.fn((callback) => {
                commandCallback = callback;
                return () => { commandCallback = null; };
            })
        },
        simulateConnectionChange: (connected: boolean) => {
            if (connectionCallback) connectionCallback(connected);
        },
        simulateVideoReady: (ready: boolean) => {
            if (videoReadyCallback) videoReadyCallback(ready);
        },
        simulateCommand: (command: any) => {
            if (commandCallback) commandCallback(command);
        }
    };
};