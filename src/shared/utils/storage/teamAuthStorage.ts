// src/shared/utils/storage/teamAuthStorage.ts
/**
 * Team authentication storage utility
 * Manages persistent team login state in localStorage with 24-hour expiration
 */

export interface TeamAuthData {
    teamId: string;
    teamName: string;
    loginTime: number;
}

const TWENTY_FOUR_HOURS_MS: number = 24 * 60 * 60 * 1000;

export const teamAuthStorage = {
    /**
     * Save team authentication data to localStorage
     */
    save(sessionId: string, teamId: string, teamName: string): void {
        if (!sessionId) {
            console.warn('[teamAuthStorage] Cannot save: sessionId is required');
            return;
        }

        localStorage.setItem(`ron_teamId_${sessionId}`, teamId);
        localStorage.setItem(`ron_teamName_${sessionId}`, teamName);
        localStorage.setItem(`ron_loginTime_${sessionId}`, Date.now().toString());

        console.log(`[teamAuthStorage] Saved auth for team ${teamName} in session ${sessionId.substring(0, 8)}`);
    },

    /**
     * Load team authentication data from localStorage
     * Returns null if no data exists or if data is expired (>24 hours)
     */
    load(sessionId: string): TeamAuthData | null {
        if (!sessionId) {
            return null;
        }

        const teamId: string | null = localStorage.getItem(`ron_teamId_${sessionId}`);
        const teamName: string | null = localStorage.getItem(`ron_teamName_${sessionId}`);
        const loginTimeStr: string | null = localStorage.getItem(`ron_loginTime_${sessionId}`);

        // Check if all required data exists
        if (!teamId || !teamName || !loginTimeStr) {
            return null;
        }

        const loginTime: number = parseInt(loginTimeStr, 10);
        const currentTime: number = Date.now();
        const timeSinceLogin: number = currentTime - loginTime;

        // Check if expired (>24 hours)
        if (timeSinceLogin >= TWENTY_FOUR_HOURS_MS) {
            console.log('[teamAuthStorage] Session expired (>24 hours), clearing stored data');
            this.clear(sessionId);
            return null;
        }

        const hoursRemaining: number = Math.floor((TWENTY_FOUR_HOURS_MS - timeSinceLogin) / (60 * 60 * 1000));
        console.log(`[teamAuthStorage] Loaded auth for team ${teamName} (${hoursRemaining}h remaining)`);

        return {teamId, teamName, loginTime};
    },

    /**
     * Clear all team authentication data from localStorage for a session
     */
    clear(sessionId: string): void {
        if (!sessionId) {
            return;
        }

        localStorage.removeItem(`ron_teamId_${sessionId}`);
        localStorage.removeItem(`ron_teamName_${sessionId}`);
        localStorage.removeItem(`ron_loginTime_${sessionId}`);

        console.log(`[teamAuthStorage] Cleared auth data for session ${sessionId.substring(0, 8)}`);
    },

    /**
     * Check if the stored session is still valid (within 24 hours)
     */
    isValid(sessionId: string): boolean {
        if (!sessionId) {
            return false;
        }

        const loginTimeStr: string | null = localStorage.getItem(`ron_loginTime_${sessionId}`);
        if (!loginTimeStr) {
            return false;
        }

        const loginTime: number = parseInt(loginTimeStr, 10);
        const currentTime: number = Date.now();
        return (currentTime - loginTime) < TWENTY_FOUR_HOURS_MS;
    },

    /**
     * Get time remaining until expiration in milliseconds
     */
    getTimeRemaining(sessionId: string): number | null {
        if (!sessionId) {
            return null;
        }

        const loginTimeStr: string | null = localStorage.getItem(`ron_loginTime_${sessionId}`);
        if (!loginTimeStr) {
            return null;
        }

        const loginTime: number = parseInt(loginTimeStr, 10);
        const currentTime: number = Date.now();
        const timeRemaining: number = TWENTY_FOUR_HOURS_MS - (currentTime - loginTime);

        return timeRemaining > 0 ? timeRemaining : 0;
    }
};
