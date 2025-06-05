// src/views/host/hooks/useDashboardData.ts - Enhanced with lifecycle management
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {GameSessionManager} from '@core/game/GameSessionManager';
import {GameSession} from '@shared/types';

interface CategorizedGames {
    draft: GameSession[];
    active: GameSession[];
    completed: GameSession[];
}

interface UseDashboardDataReturn {
    games: CategorizedGames;
    allGames: GameSession[]; // For backwards compatibility
    isLoadingGames: boolean;
    gamesError: string | null;
    refetchGames: () => Promise<CategorizedGames | null>;
}

export const useDashboardData = (userId?: string): UseDashboardDataReturn => {
    const sessionManager = GameSessionManager.getInstance();

    const {
        data: categorizedGames,
        isLoading: isLoadingGames,
        error: gamesError,
        refresh: refetchGames
    } = useSupabaseQuery(
        async () => {
            if (!userId) return {draft: [], active: [], completed: []};
            return await sessionManager.getCategorizedSessionsForTeacher(userId);
        },
        [userId],
        {
            cacheKey: `categorized-sessions-${userId}`,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
            retryOnError: true,
            maxRetries: 2,
            onError: (error) => {
                console.error("DashboardData: Error fetching games:", error);
            }
        }
    );

    const games = categorizedGames || {draft: [], active: [], completed: []};
    const allGames = [...games.draft, ...games.active, ...games.completed];

    return {
        games,
        allGames, // For backwards compatibility
        isLoadingGames,
        gamesError,
        refetchGames
    };
};
