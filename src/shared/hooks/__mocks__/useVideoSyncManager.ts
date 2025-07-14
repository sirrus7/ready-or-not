import { vi } from 'vitest';

export const useVideoSyncManager = vi.fn(() => ({
    sendCommand: vi.fn(),
    onConnectionChange: vi.fn(() => () => {}),
    setPresentationReady: vi.fn()
}));