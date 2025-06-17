// src/views/host/hooks/useDashboardData.ts - Fixed infinite loop issue
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
    clearCache: () => void;
}

export const useDashboardData = (userId?: string): UseDashboardDataReturn => {
    const sessionManager = GameSessionManager.getInstance();

    const {
        data: categorizedGames,
        isLoading: isLoadingGames,
        error: gamesError,
        refresh: refetchGames,
        clearCache
    } = useSupabaseQuery(
        async () => {
            if (!userId) return {draft: [], active: [], completed: []};

            console.log('[useDashboardData] Fetching categorized sessions for user:', userId);
            const result = await sessionManager.getCategorizedSessionsForHost(userId);
            console.log('[useDashboardData] Fetched games:', {
                draft: result.draft.length,
                active: result.active.length,
                completed: result.completed.length
            });

            return result;
        },
        [userId],
        {
            cacheKey: `categorized-sessions-${userId}`,
            cacheTimeout: 30 * 1000, // 30 seconds cache timeout
            retryOnError: true,
            maxRetries: 2,
            onError: (error) => {
                console.error("DashboardData: Error fetching games:", error);
            }
        }
    );

    const games = categorizedGames || {draft: [], active: [], completed: []};
    const allGames = [...games.draft, ...games.active, ...games.completed];

    // FIXED: Simple refetch function that doesn't clear cache automatically
    // The caller (DashboardPage) will handle cache clearing when needed
    const enhancedRefetchGames = async () => {
        console.log('[useDashboardData] Refetching games data');
        return await refetchGames();
    };

    return {
        games,
        allGames,
        isLoadingGames,
        gamesError,
        refetchGames: enhancedRefetchGames,
        clearCache
    };
};
