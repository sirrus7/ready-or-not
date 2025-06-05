// src/shared/types/database.ts - Updated with new session fields
import type {DoubleDownChoice, KpiKey} from './game';
import type {NewGameData} from './ui';

export interface GameSession {
    id: string;
    teacher_id: string;
    name: string;
    game_version: '2.0_dd' | '1.5_dd';
    class_name?: string | null;
    grade_level?: string | null;
    current_phase_id: string | null;
    current_slide_id_in_phase: number | null;
    is_playing: boolean;
    is_complete: boolean;
    teacher_notes: Record<string, string> | null;
    status: 'draft' | 'active' | 'completed'; // New field
    wizard_state: Partial<NewGameData> | null; // New field
    created_at: string;
    updated_at: string;
}

export interface Team {
    id: string;
    session_id: string;
    name: string;
    passcode: string;
}

export interface TeamRoundData {
    id: string;
    session_id: string;
    team_id: string;
    round_number: 1 | 2 | 3;
    start_capacity: number;
    current_capacity: number;
    start_orders: number;
    current_orders: number;
    start_cost: number;
    current_cost: number;
    start_asp: number;
    current_asp: number;
    revenue: number;
    net_margin: number;
    net_income: number;
    round_investment_spend?: number;
    round_event_spend?: number;
}

export interface TeamDecision {
    id: string;
    session_id: string;
    team_id: string;
    phase_id: string;
    round_number: 0 | 1 | 2 | 3;
    selected_investment_ids?: string[];
    selected_challenge_option_id?: string;
    double_down_decision?: DoubleDownChoice;
    total_spent_budget?: number;
    submitted_at: string;
}

export interface PermanentKpiAdjustment {
    id?: string;
    session_id: string;
    team_id: string;
    applies_to_round_start: 1 | 2 | 3;
    kpi_key: KpiKey;
    change_value: number;
    is_percentage?: boolean;
    description?: string;
}
