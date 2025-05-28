// src/types/index.ts
// (Assuming this file is mostly complete from your previous provision.
// Ensure KpiEffect, InvestmentOption, ChallengeOption, Consequence, InvestmentPayoff are robust enough
// for the details in your spreadsheets. For example, descriptions in InvestmentOption might be useful.)

import {User as SupabaseUser} from '@supabase/supabase-js';

// --- User & Authentication ---
export type User = SupabaseUser;

// --- Core Game Entities ---
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
    teacher_notes: Record<string, string> | null; // Changed key to string for slideId
    created_at: string;
    updated_at: string;
}

export interface Team {
    id: string;
    session_id: string;
    name: string;
    passcode: string;
}

// --- Key Performance Indicators (KPIs) ---
export interface KPIs {
    capacity: number;
    orders: number;
    cost: number;
    asp: number;
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
    revenue: number; // Changed from optional
    net_margin: number; // Changed from optional
    net_income: number; // Changed from optional
    // Optional: Store raw investment/choice costs for the round if needed for detailed reports
    round_investment_spend?: number;
    round_event_spend?: number;
}

// --- Decisions & Options ---
export interface InvestmentOption {
    id: string;
    name: string;
    cost: number;
    description?: string; // Added for clarity on student app
}

export interface ChallengeOption {
    id: string;
    text: string;
    estimated_cost?: number;
    immediate_kpi_impact_preview?: string;
    is_default_choice?: boolean;
}

export interface DoubleDownChoice {
    investmentToSacrificeId: string | null;
    investmentToDoubleDownId: string | null;
}

export interface TeamDecision {
    id: string;
    session_id: string;
    team_id: string;
    phase_id: string;
    round_number: 0 | 1 | 2 | 3; // round 0 for pre-game if any decisions made there
    selected_investment_ids?: string[];
    selected_challenge_option_id?: string;
    double_down_decision?: DoubleDownChoice;
    total_spent_budget?: number;
    submitted_at: string;
}

export interface TeamConfig {
    name: string;
    passcode: string;
}

export interface NewGameData {
    game_version: '2.0_dd' | '1.5_dd';
    name: string;
    class_name: string;
    grade_level: string;
    num_players: number;
    num_teams: number;
    teams_config?: TeamConfig[];
}

export type KpiKey = 'capacity' | 'orders' | 'cost' | 'asp' | 'revenue' | 'net_margin' | 'net_income';

export interface KpiEffect {
    kpi: KpiKey;
    change_value: number;
    is_percentage_change?: boolean;
    timing: 'immediate' | 'permanent_next_round_start' | 'end_of_round_adjustment';
    description?: string;
    applies_to_rounds?: (1 | 2 | 3)[];
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

export interface Consequence {
    id: string;
    challenge_option_id: string;
    narrative_text: string;
    effects: KpiEffect[];
    teacher_alert?: string;
    student_notification?: string;
    impact_card_image_url?: string;
    details?: string[]; // Added for consequence slides
}

export interface InvestmentPayoff {
    id: string;
    investment_option_id: string;
    name: string;
    effects: KpiEffect[];
}

export interface DoubleDownPayoffRollResult {
    dice_roll: number;
    percentage_boost: number;
    description: string;
}

export type SlideType =
    | 'image'
    | 'video'
    | 'content_page'
    | 'interactive_invest'
    | 'interactive_choice'
    | 'interactive_double_down_prompt'
    | 'interactive_double_down_select'
    | 'consequence_reveal'
    | 'payoff_reveal'
    | 'double_down_dice_roll'
    | 'kpi_summary_instructional'
    | 'leaderboard_chart'
    | 'game_end_summary';

export interface Slide {
    id: number;
    title?: string;
    phase_id?: string;
    type: SlideType;
    source_url?: string;
    main_text?: string;
    sub_text?: string;
    bullet_points?: string[];
    background_css?: string;
    interactive_data_key?: string;
    timer_duration_seconds?: number;
    auto_advance_after_video?: boolean;
    teacher_alert?: {
        title: string;
        message: string;
    };
    details?: string[]; // For consequence/payoff reveal slides
}

export interface GamePhaseNode {
    id: string;
    label: string;
    sub_label?: string;
    icon_name: string;
    phase_type: 'welcome' | 'setup' | 'narration' | 'invest' | 'choice' | 'consequence' | 'payoff' | 'double-down-prompt' | 'double-down-select' | 'double-down-payoff' | 'kpi' | 'leaderboard' | 'game-end';
    round_number: 0 | 1 | 2 | 3;
    slide_ids: number[];
    is_interactive_student_phase: boolean;
    expected_duration_minutes?: number;
}

export interface GameRound {
    id: string;
    name: string;
    year_label: string;
    phases: GamePhaseNode[];
}

export interface GameStructure {
    id: string;
    name: string;
    welcome_phases: GamePhaseNode[];
    rounds: GameRound[];
    game_end_phases: GamePhaseNode[];
    slides: Slide[];
    all_investment_options: Record<string, InvestmentOption[]>;
    all_challenge_options: Record<string, ChallengeOption[]>;
    investment_phase_budgets: Record<string, number>; // key is phase_id (e.g. rd1-invest)
    all_consequences: Record<string, Consequence[]>;
    all_investment_payoffs: Record<string, InvestmentPayoff[]>;
    allPhases: GamePhaseNode[]; // Added for convenience
}

export interface AppState {
    currentSessionId: string | null;
    gameStructure: GameStructure | null;
    currentPhaseId: string | null;
    currentSlideIdInPhase: number | null;
    teacherNotes: Record<string, string>; // Keyed by slide ID (as string)
    isPlaying: boolean;
    teams: Team[];
    teamDecisions: Record<string, Record<string, TeamDecision>>; // teamId -> phaseId -> Decision
    teamRoundData: Record<string, Record<number, TeamRoundData>>; // teamId -> roundNumber -> RoundData
    isStudentWindowOpen: boolean;
    isLoading: boolean;
    error: string | null;
    currentTeacherAlert: { title: string, message: string } | null;
}

export interface StudentPageState {
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

export interface TeacherBroadcastPayload {
    currentSlideId: number | null;
    currentPhaseId: string | null;
    currentPhaseType: GamePhaseNode['phase_type'] | null;
    currentRoundNumber: 0 | 1 | 2 | 3 | null;
    isPlayingVideo: boolean;
    videoCurrentTime?: number;
    triggerVideoSeek?: boolean;
    isStudentDecisionPhaseActive: boolean;
    decisionOptionsKey?: string;
    decisionPhaseTimerEndTime?: number;
}

export interface DisplayMessage {
    type: 'STUDENT_DISPLAY_READY' | 'STUDENT_DISPLAY_CLOSING';
    payload: {
        sessionId: string | null;
    };
}