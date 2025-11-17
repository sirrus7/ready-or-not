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

    // NEW: Immediate purchase support
    is_immediate_purchase?: boolean;
    immediate_purchase_type?: string; // e.g., 'business_growth_strategy', 'market_research', etc.
    immediate_purchase_message?: string; // Custom message for the immediate purchase modal
    host_notification_message?: string; // Custom message for host notification
    report_name?: string; // e.g., 'Business Growth Strategy Report', 'Market Analysis Report'
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

    // Challenge identification
    challenge_id?: string;  // 'ch1', 'ch2', 'inv1', 'inv2', etc.
    option_id?: string;     // 'A', 'B', 'C', 'D' (only for consequences, not investments)
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
    name: string;
    effects: KpiEffect[];
}

export type SlideType =
    | 'image'                               // Flat image slides
    | 'video'                               // Standard video slides
    | 'interactive_invest'                  // Investment slides
    | 'payoff_reveal'                       // Payoff to Invest
    | 'interactive_choice'                  // Choice slides
    | 'consequence_reveal'                  // Consequence to choices
    | 'interactive_double_down_select'      // Double Down Select slide
    | 'double_down_dice_roll'               // Double Down Dice Roll Slides
    | 'kpi_reset'                           // Reset KPI slides after Rounds 1 and 2
    | 'leaderboard_chart';                  // Leaderboard slides at end of rounds

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
    immunity_bonus?: boolean;
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

export interface KpiChange {
    team_name: string;
    changes: {
        kpi: string;
        change_value: number;
        display_value: string;
    }[];
}

export interface StrategyInvestmentDetails {
    hasStrategy: boolean;
    purchaseRound: number | null;
    purchasePhaseId: string | null;
}

export enum GameVersion {
    V1_5_ACADEMIC = '1.5_academic',
    V1_5_NO_DD = '1.5_no_dd',
    V1_5_DD = '1.5_dd',
    V2_0_NO_DD = '2.0_no_dd',
    V2_0_DD = '2.0_dd'
}
