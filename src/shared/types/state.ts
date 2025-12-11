// src/shared/types/state.ts
import type {GameStructure, HostAlertCategory} from './game';
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
    isLoading: boolean;
    error: string | null;
    currentHostAlert: { 
        title: string;
        message: string;
        category?: HostAlertCategory;
    } | null;
}

