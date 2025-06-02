// src/shared/types/state.ts
// These types define the application state for different parts of the app

// Use 'import type' for type-only imports
import type {GameStructure, ChallengeOption, InvestmentOption, Slide} from './game';
import type {Team, TeamDecision, TeamRoundData} from './database';

export interface AppState {
    currentSessionId: string | null;
    gameStructure: GameStructure | null;
    currentPhaseId: string | null;
    currentSlideIdInPhase: number | null;
    hostNotes: Record<string, string>;
    isPlaying: boolean; // Keep for backward compatibility but might be removed in future phases
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>; // teamId -> phaseId -> Decision
    teamRoundData: Record<string, Record<number, TeamRoundData>>; // teamId -> roundNumber -> RoundData
    isPlayerWindowOpen: boolean; // Keep for backward compatibility but might be removed
    isLoading: boolean;
    error: string | null;
    currentHostAlert: { title: string, message: string } | null;
}

export interface PlayerPageState {
    teamId: string | null;
    teamName: string | null;
    currentSessionId: string | null;
    activePhaseId: string | null;
    activeSlideData: Slide | null;
    currentKpis: TeamRoundData | null;
    availableChoices?: ChallengeOption[] | InvestmentOption[];
    decisionBudget?: { investUpTo: number, remaining: number, spent: number };
    timeRemainingSeconds?: number;
    isDecisionTime: boolean;
    lastSubmissionStatus?: 'success' | 'error' | null;
}
