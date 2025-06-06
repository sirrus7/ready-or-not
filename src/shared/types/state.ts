// src/shared/types/state.ts
import type {GameStructure, ChallengeOption, InvestmentOption, Slide} from './game';
import type {Team, TeamDecision, TeamRoundData} from './database';

export interface AppState {
    currentSessionId: string | null;
    gameStructure: GameStructure | null;
    current_slide_index: number | null;
    hostNotes: Record<string, string>;
    isPlaying: boolean;
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>;
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
    isPlayerWindowOpen: boolean; // Legacy field
    isLoading: boolean;
    error: string | null;
    currentHostAlert: { title: string, message: string } | null;
}

export interface PlayerPageState {
    teamId: string | null;
    teamName: string | null;
    currentSessionId: string | null;
    activeSlideData: Slide | null;
    currentKpis: TeamRoundData | null;
    availableChoices?: ChallengeOption[] | InvestmentOption[];
    decisionBudget?: { investUpTo: number, remaining: number, spent: number };
    timeRemainingSeconds?: number;
    isDecisionTime: boolean;
    lastSubmissionStatus?: 'success' | 'error' | null;
}