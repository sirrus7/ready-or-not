// src/shared/types/database.ts
export interface PermanentKpiAdjustment {
    id: string;
    session_id: string;
    team_id: string;
    applies_to_round_start: number;
    kpi_key: string;
    change_value: number;
    description: string;
    created_at: string;

    // NEW: Explicit challenge tracking
    challenge_id: string;  // 'ch1', 'ch2', etc.
    option_id: string;     // 'A', 'B', 'C', 'D'
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
    name: string;
    host_id: string;
    current_slide_index: number | null;
    game_version: string;
    class_name: string | null;
    grade_level: string | null;
    is_playing: boolean;
    is_complete: boolean;
    host_notes: Record<string, string>;
    status: 'draft' | 'active' | 'completed';
    wizard_state: Record<string, any> | null;
    created_at: string;
    updated_at: string;
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
    selected_investment_options: string[] | null;
    selected_challenge_option_id: string | null;
    double_down_sacrifice_id: string | null;
    double_down_on_id: string | null;
    total_spent_budget: number;
    submitted_at: string;
    is_immediate_purchase: boolean;
    immediate_purchase_type: string | null;
    immediate_purchase_data: any | null;
    report_given: boolean;
    report_given_at: string | null;
}