// src/shared/types/results.ts
import {Team, TeamRoundData} from './database';

export interface TeamStanding {
    team: Team;
    round3Data: TeamRoundData;
    consolidatedNetIncome: number; // Sum of net income across all 3 rounds
    revenue: number; // Round 3 revenue
    netMargin: number; // Round 3 net margin
    capacity: number; // Round 3 capacity
    orders: number; // Round 3 orders
    asp: number; // Round 3 ASP
    costs: number; // Round 3 costs
}

export interface GameStatistics {
    totalRevenue: number;
    avgConsolidatedNetIncome: number;
    highestConsolidatedNetIncome: number;
    lowestConsolidatedNetIncome: number;
    totalTeams: number;
}
