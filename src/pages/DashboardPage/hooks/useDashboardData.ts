// src/pages/DashboardPage/hooks/useDashboardData.ts - Data fetching logic
import { useSupabaseQuery } from '../../../hooks/supabase';
import { db } from '../../../utils/supabase';
import { GameSession } from '../../../types';

interface UseDashboardDataReturn {
    games: GameSession[];
    isLoadingGames: boolean;
    gamesError: string | null;
    refetchGames: () => Promise<GameSession[] | null>;
}

export const useDashboardData = (userId?: string): UseDashboardDataReturn => {
    const {
        data: allGames,
        isLoading: isLoadingGames,
        error: gamesError,
        refresh: refetchGames
    } = useSupabaseQuery(
        () => db.sessions.getByTeacher(userId || ''),
        [userId],
        {
            cacheKey: `teacher-sessions-${userId}`,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
            retryOnError: true,
            maxRetries: 2,
            onError: (error) => {
                console.error("DashboardData: Error fetching games:", error);
            }
        }
    );

    return {
        games: allGames || [],
        isLoadingGames,
        gamesError,
        refetchGames
    };
};
