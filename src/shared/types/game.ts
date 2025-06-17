// src/shared/types/game.ts
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

    // NEW: Explicit challenge identification
    challenge_id: string;  // 'ch1', 'ch2', etc.
    option_id: string;     // 'A', 'B', 'C', 'D'
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
    round_number: 0 | 1 | 2 | 3;
    type: SlideType;
    source_path?: string;
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

export interface GameStructure {
    id: string;
    name: string;
    slides: Slide[];
    interactive_slides: Slide[];
    all_investment_options: Record<string, InvestmentOption[]>;
    all_challenge_options: Record<string, ChallengeOption[]>;
    investment_phase_budgets: Record<string, number>;
    all_consequences: Record<string, Consequence[]>;
    all_investment_payoffs: Record<string, InvestmentPayoff[]>;
}

// NEW: Challenge Metadata Registry
export interface ChallengeMetadata {
    id: string;
    title: string;
    round: 1 | 2 | 3;
    impact_card_title: string;
    impact_card_description: string;
    consequence_slides: number[];
}
