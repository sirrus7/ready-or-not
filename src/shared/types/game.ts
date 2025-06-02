// src/shared/types/game.ts
// These types define the core game content, rules, and logic

export interface KPIs {
    capacity: number;
    orders: number;
    cost: number;
    asp: number;
}

export interface InvestmentOption {
    id: string;
    name: string;
    cost: number;
    description?: string;
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

export type KpiKey = 'capacity' | 'orders' | 'cost' | 'asp' | 'revenue' | 'net_margin' | 'net_income';

export interface KpiEffect {
    kpi: KpiKey;
    change_value: number;
    is_percentage_change?: boolean;
    timing: 'immediate' | 'permanent_next_round_start' | 'end_of_round_adjustment';
    description?: string;
    applies_to_rounds?: (1 | 2 | 3)[];
}

export interface Consequence {
    id: string;
    challenge_option_id: string;
    narrative_text: string;
    effects: KpiEffect[];
    host_alert?: string;
    player_notification?: string;
    impact_card_image_url?: string;
    details?: string[];
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
    host_alert?: {
        title: string;
        message: string;
    };
    details?: string[];
}

export interface GamePhaseNode {
    id: string;
    label: string;
    sub_label?: string;
    icon_name: string;
    phase_type: 'welcome' | 'setup' | 'narration' | 'invest' | 'choice' | 'consequence' | 'payoff' | 'double-down-prompt' | 'double-down-select' | 'double-down-payoff' | 'kpi' | 'leaderboard' | 'game-end';
    round_number: 0 | 1 | 2 | 3;
    slide_ids: number[];
    is_interactive_player_phase: boolean;
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
    investment_phase_budgets: Record<string, number>;
    all_consequences: Record<string, Consequence[]>;
    all_investment_payoffs: Record<string, InvestmentPayoff[]>;
    allPhases: GamePhaseNode[];
}
