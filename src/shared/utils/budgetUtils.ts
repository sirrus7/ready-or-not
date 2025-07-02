// src/shared/utils/budgetUtils.ts
// Centralized investment budget utilities

/**
 * Investment budgets for each round
 * These values match the game slides and should be the single source of truth
 */
export const INVESTMENT_BUDGETS = {
    1: 250000, // Round 1: $250K (from slide: "INVEST UP TO $250K")
    2: 500000, // Round 2: $500K (from slide: "INVEST UP TO $500K")
    3: 600000  // Round 3: $600K (from slide: "Invest up to $600K")
} as const;

/**
 * Investment phase budgets mapped by phase ID
 * Used by GameStructure and other phase-based lookups
 */
export const INVESTMENT_PHASE_BUDGETS = {
    'rd1-invest': INVESTMENT_BUDGETS[1],
    'rd2-invest': INVESTMENT_BUDGETS[2],
    'rd3-invest': INVESTMENT_BUDGETS[3],
} as const;

/**
 * Get budget for a specific round number
 */
export const getBudgetForRound = (roundNumber: 1 | 2 | 3): number => {
    return INVESTMENT_BUDGETS[roundNumber];
};

/**
 * Get budget for a specific phase ID
 */
export const getBudgetForPhase = (phaseId: string): number => {
    return INVESTMENT_PHASE_BUDGETS[phaseId as keyof typeof INVESTMENT_PHASE_BUDGETS] || 0;
};

/**
 * Get round number from phase ID
 */
export const getRoundFromPhase = (phaseId: string): 1 | 2 | 3 | null => {
    if (phaseId === 'rd1-invest') return 1;
    if (phaseId === 'rd2-invest') return 2;
    if (phaseId === 'rd3-invest') return 3;
    return null;
};

// Type exports for better TypeScript support
export type RoundNumber = keyof typeof INVESTMENT_BUDGETS;
export type PhaseId = keyof typeof INVESTMENT_PHASE_BUDGETS;
