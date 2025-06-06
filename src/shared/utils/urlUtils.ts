// src/shared/utils/urlUtils.ts
import {shortenUrl} from '@shared/services/tinyUrlService';

/**
 * Generates the full, long URL for a team to join a specific game session.
 * @param sessionId The ID of the game session.
 * @returns The full, long URL.
 */
export const getTeamJoinLongUrl = (sessionId: string): string => {
    if (!sessionId) return '';
    return `${window.location.origin}/team/${sessionId}`;
};

/**
 * Generates a join URL for a team, with an option to shorten it.
 * @param sessionId The ID of the game session.
 * @param useShortUrl If true, attempts to shorten the URL via TinyURL. Defaults to true.
 * @returns The potentially shortened URL.
 */
export const generateTeamJoinUrl = async (sessionId: string | null, useShortUrl: boolean = true): Promise<string> => {
    if (!sessionId) return '';
    const longUrl = getTeamJoinLongUrl(sessionId);
    if (useShortUrl) {
        return await shortenUrl(longUrl);
    }
    return longUrl;
};
