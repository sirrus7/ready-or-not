import { vi } from 'vitest';

// Export individual mocks so tests can access them
export const mockSendCommand = vi.fn();
export const mockSetPresentationReady = vi.fn();
export const mockSendVideoReady = vi.fn();
export const mockOnConnectionChange = vi.fn();
export const mockOnVideoReady = vi.fn();
export const mockOnCommand = vi.fn();

// Default mock implementation
export const useVideoSyncManager = vi.fn((props) => {
    // Return the mock implementation
    return {
        sendCommand: mockSendCommand,
        isConnected: false,
        onConnectionChange: mockOnConnectionChange,
        onVideoReady: mockOnVideoReady,
        setPresentationReady: mockSetPresentationReady,
        sendVideoReady: mockSendVideoReady,
        onCommand: mockOnCommand
    };
});