import { vi, describe, it, expect } from 'vitest';

// Mock BEFORE import
vi.mock('@shared/hooks/useVideoSyncManager');

// Import after mock
import { useVideoSyncManager } from '@shared/hooks/useVideoSyncManager';

describe('Debug Mock Test', () => {
    it('should verify mock is being used', () => {
        // Check if the function is mocked
        expect(vi.isMockFunction(useVideoSyncManager)).toBe(true);
        
        // Call it
        const result = useVideoSyncManager({ sessionId: 'test', role: 'host' });
        
        // Log what we get
        console.log('Mock result:', result);
        console.log('Is sendCommand a function?', typeof result.sendCommand);
        
        // The mock should have been called
        expect(useVideoSyncManager).toHaveBeenCalled();
    });
});