import { GameVersion } from "./game";

// src/shared/types/database.ts
export interface PermanentKpiAdjustment {
    id: string;
    session_id: string;
    team_id: string;
    applies_to_round_start: number;
    kpi_key: string;
    change_value: number;
    description: string;
    challenge_id: string;  // 'ch1', 'ch2', etc.
    option_id: string;     // 'A', 'B', 'C', 'D'
    created_at: string;
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
}

export interface GameSession {
    id: string;
    host_id: string;
    name: string;
    game_version: GameVersion | string; // string type to account for legacy '1.5' games
    class_name: string | null;
    grade_level: string | null;
    is_playing: boolean;
    is_complete: boolean;
    host_notes: Record<string, string>;
    created_at: string;
    updated_at: string;
    status: 'draft' | 'active' | 'completed';
    wizard_state: Record<string, any> | null;
    current_slide_index: number | null;
}

export type GameSessionInsert = Omit<GameSession, 'id' | 'created_at' | 'updated_at'>;

export interface Team {
    id: string;
    session_id: string;
    name: string;
    passcode: string;
    created_at: string;
}

export interface TeamDecision {
    id: string;
    session_id: string;
    team_id: string;
    phase_id: string;
    round_number: number;
    selected_challenge_option_id: string | null;
    double_down_sacrifice_id: string | null;
    double_down_on_id: string | null;
    total_spent_budget: number | null;
    submitted_at: string;
    is_immediate_purchase: boolean;
    immediate_purchase_type: string | null;
    immediate_purchase_data: any | null;
    report_given: boolean;
    report_given_at: string | null;
    selected_investment_options: string[] | null;
}

// Used to get the specific data we need from the team_decisions for double down selection
export interface DoubleDownDecision {
    team_id: string;
    team_name: string;
    double_down_sacrifice_id: string | null;
    double_down_on_id: string;
}

export interface DoubleDownResult {
    id: string;
    session_id: string;
    investment_id: string;
    dice1_value: number;
    dice2_value: number;
    total_value: number;
    boost_percentage: number;
    affected_teams: string[];
    created_at: string;
    capacity_change: number;
    orders_change: number;
    asp_change: number;
    cost_change: number;
}

export interface PayoffApplication {
    id: string;
    session_id: string;
    team_id: string;
    slide_id: number;
    applied_at: string;
    created_at: string;
    investment_phase_id: string;
    option_id: string;
}
