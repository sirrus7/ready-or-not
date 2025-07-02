// src/shared/components/UI/Leaderboard/types.ts
import {Team, TeamRoundData} from '@shared/types/database';

export interface LeaderboardItem {
    teamName: string;
    value: number;
    formattedValue: string;
    rank: number;
    secondaryValue?: string; // For capacity & orders display
    effectiveValue?: number;
}

export interface LeaderboardChartDisplayProps {
    slideId: number;
    currentRoundForDisplay: number | null;
    teams?: Team[];
    teamRoundData?: Record<string, Record<number, TeamRoundData>>;
}

export interface DualBarLeaderboardProps {
    leaderboardData: LeaderboardItem[];
    kpiLabel: string;
    secondaryKpiLabel: string;
    roundDisplay: string;
}

export interface SingleBarLeaderboardProps {
    leaderboardData: LeaderboardItem[];
    kpiLabel: string;
    roundDisplay: string;
    dataKey: string;
}

export interface NetIncomeRevealProps {
    leaderboardData: LeaderboardItem[];
    roundDisplay: string;
}
