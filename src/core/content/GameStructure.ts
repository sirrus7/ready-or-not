// src/core/content/GameStructure.ts - Defines game structure, imports content

import { GameStructure, GamePhaseNode } from '@shared/types/game';
import { allGameSlides } from './SlideContent';
import { allInvestmentOptionsData } from './InvestmentOptions';
import { allChallengeOptionsData } from './ChallengeOptions';
import { allConsequencesData } from './ConsequenceContent';
import { allInvestmentPayoffsData } from './InvestmentPayoffContent';

// Inlined from src/data/gameStructure/welcome.ts (welcomePhases only)
export const welcomePhases: GamePhaseNode[] = [
    {
        id: 'welcome-intro',
        label: "WELCOME",
        sub_label: "Start",
        icon_name: 'PlayCircle',
        phase_type: 'welcome',
        round_number: 0,
        slide_ids: [0, 1, 2, 3],
        is_interactive_player_phase: false,
        expected_duration_minutes: 3
    },
    {
        id: 'game-setup',
        label: "SETUP",
        icon_name: 'Film',
        phase_type: 'narration',
        round_number: 0,
        slide_ids: [4, 5, 6],
        is_interactive_player_phase: false,
        expected_duration_minutes: 7
    },
];

// Inlined from src/data/gameStructure/round1/phases.ts
export const round1Phases: GamePhaseNode[] = [
    {
        id: 'rd1-invest',
        label: "INVEST",
        sub_label: "15 Minutes",
        icon_name: 'DollarSign',
        phase_type: 'invest',
        round_number: 1,
        slide_ids: [7, 8, 9],
        is_interactive_player_phase: true,
        expected_duration_minutes: 20
    },
    {
        id: 'ch1',
        label: "CHOICE 1",
        sub_label: "Machinery",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 1,
        slide_ids: [10, 11, 12, 13, 14, 15, 16, 17, 18],
        is_interactive_player_phase: true,
        expected_duration_minutes: 8
    },
    {
        id: 'ch1-conseq',
        label: "CHOICE 1",
        sub_label: "Impact",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 1,
        slide_ids: [19, 20, 21, 22, 23, 24],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'ch2',
        label: "CHOICE 2",
        sub_label: "New Tax",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 1,
        slide_ids: [25, 26, 27, 28, 29, 30, 31, 32, 33],
        is_interactive_player_phase: true,
        expected_duration_minutes: 8
    },
    {
        id: 'ch2-conseq',
        label: "CHOICE 2.",
        sub_label: "Impact",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 1,
        slide_ids: [34, 35, 36, 37, 38, 39],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'ch3',
        label: "CHOICE 3",
        sub_label: "Recession",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 1,
        slide_ids: [40, 41, 42, 43, 44, 45, 46, 47, 48],
        is_interactive_player_phase: true,
        expected_duration_minutes: 8
    },
    {
        id: 'ch3-conseq',
        label: "CHOICE 3.",
        sub_label: "Impact",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 1,
        slide_ids: [49, 50, 51, 52, 53, 54],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'rd1-payoff',
        label: "PAYOFF",
        icon_name: 'TrendingUp',
        phase_type: 'payoff',
        round_number: 1,
        slide_ids: [55, 56, 57, 58, 59, 60, 61],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'rd1-kpi',
        label: "KPIs",
        icon_name: 'BarChart3',
        phase_type: 'kpi',
        round_number: 1,
        slide_ids: [62],
        is_interactive_player_phase: false,
        expected_duration_minutes: 2
    },
    {
        id: 'rd1-leaderboard',
        label: "LEADERBOARD",
        icon_name: 'Trophy',
        phase_type: 'leaderboard',
        round_number: 1,
        slide_ids: [63, 63.1, 63.2, 63.3, 63.4, 63.5, 63.6, 63.7],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
];

export const round2Phases: GamePhaseNode[] = [
    {
        id: 'rd2-invest',
        label: "RD-2 INVEST",
        sub_label: "Years 3&4",
        icon_name: 'DollarSign',
        phase_type: 'invest',
        round_number: 2,
        slide_ids: [100, 101],
        is_interactive_player_phase: true,
        expected_duration_minutes: 12
    },
    {
        id: 'ch4',
        label: "CHOICE 4",
        sub_label: "Supply Chain",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 2,
        slide_ids: [102, 103],
        is_interactive_player_phase: true,
        expected_duration_minutes: 3
    },
    {
        id: 'ch4-conseq',
        label: "CONSEQ.",
        sub_label: "CH4",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 2,
        slide_ids: [104, 105, 106, 107],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'ch5',
        label: "CHOICE 5",
        sub_label: "Labor Strike",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 2,
        slide_ids: [108, 109],
        is_interactive_player_phase: true,
        expected_duration_minutes: 3
    },
    {
        id: 'ch5-conseq',
        label: "CONSEQ.",
        sub_label: "CH5",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 2,
        slide_ids: [110, 111, 112, 113, 114, 115],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'ch6',
        label: "CHOICE 6",
        sub_label: "Market Shift",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 2,
        slide_ids: [116, 117],
        is_interactive_player_phase: true,
        expected_duration_minutes: 3
    },
    {
        id: 'ch6-conseq',
        label: "CONSEQ.",
        sub_label: "CH6",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 2,
        slide_ids: [118, 119, 120, 121, 122, 123],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'ch7',
        label: "CHOICE 7",
        sub_label: "Regulation",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 2,
        slide_ids: [124, 125],
        is_interactive_player_phase: true,
        expected_duration_minutes: 3
    },
    {
        id: 'ch7-conseq',
        label: "CONSEQ.",
        sub_label: "CH7",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 2,
        slide_ids: [126, 127, 128, 129, 130, 131],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'rd2-payoff',
        label: "RD-2 PAYOFF",
        icon_name: 'TrendingUp',
        phase_type: 'payoff',
        round_number: 2,
        slide_ids: [132, 133],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'rd2-kpi',
        label: "KPIs",
        icon_name: 'BarChart3',
        phase_type: 'kpi',
        round_number: 2,
        slide_ids: [134],
        is_interactive_player_phase: false,
        expected_duration_minutes: 2
    },
    {
        id: 'rd2-leaderboard',
        label: "LEADERBOARD",
        icon_name: 'Trophy',
        phase_type: 'leaderboard',
        round_number: 2,
        slide_ids: [135, 136, 137, 138, 139, 140, 141, 142],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    }
];

export const round3Phases: GamePhaseNode[] = [
    {
        id: 'rd3-invest',
        label: "RD-3 INVEST",
        sub_label: "Year 5",
        icon_name: 'DollarSign',
        phase_type: 'invest',
        round_number: 3,
        slide_ids: [200, 201],
        is_interactive_player_phase: true,
        expected_duration_minutes: 12
    },
    {
        id: 'ch-dd-prompt',
        label: "DOUBLE DOWN",
        sub_label: "Opportunity",
        icon_name: 'Repeat',
        phase_type: 'double-down-prompt',
        round_number: 3,
        slide_ids: [202],
        is_interactive_player_phase: true,
        expected_duration_minutes: 3
    },
    {
        id: 'ch-dd-select',
        label: "DD SELECT",
        sub_label: "Make Choice",
        icon_name: 'Zap',
        phase_type: 'double-down-select',
        round_number: 3,
        slide_ids: [203],
        is_interactive_player_phase: true,
        expected_duration_minutes: 2
    },
    {
        id: 'ch8',
        label: "CHOICE 8",
        sub_label: "Cyber Attack",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 3,
        slide_ids: [210, 211],
        is_interactive_player_phase: true,
        expected_duration_minutes: 3
    },
    {
        id: 'ch8-conseq',
        label: "CONSEQ.",
        sub_label: "CH8",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 3,
        slide_ids: [212, 213, 214, 215],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'ch9',
        label: "CHOICE 9",
        sub_label: "Market Disruption",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 3,
        slide_ids: [220, 221],
        is_interactive_player_phase: true,
        expected_duration_minutes: 3
    },
    {
        id: 'ch9-conseq',
        label: "CONSEQ.",
        sub_label: "CH9",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 3,
        slide_ids: [222, 223, 224, 225],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'rd3-payoff',
        label: "RD-3 PAYOFF",
        icon_name: 'TrendingUp',
        phase_type: 'payoff',
        round_number: 3,
        slide_ids: [230, 231],
        is_interactive_player_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'dd-payoff',
        label: "DD PAYOFF",
        icon_name: 'Zap',
        phase_type: 'double-down-payoff',
        round_number: 3,
        slide_ids: [240, 241],
        is_interactive_player_phase: false,
        expected_duration_minutes: 3
    },
    {
        id: 'rd3-kpi',
        label: "KPIs",
        icon_name: 'BarChart3',
        phase_type: 'kpi',
        round_number: 3,
        slide_ids: [250],
        is_interactive_player_phase: false,
        expected_duration_minutes: 2
    },
    {
        id: 'final-leaderboard',
        label: "FINAL BOARD",
        icon_name: 'Trophy',
        phase_type: 'leaderboard',
        round_number: 3,
        slide_ids: [251, 252, 253, 254, 255, 256, 257, 258],
        is_interactive_player_phase: false,
        expected_duration_minutes: 10
    }
];

export const gameEndPhases: GamePhaseNode[] = [];


export const readyOrNotGame_2_0_DD: GameStructure = {
    id: "ready_or_not_2.0_dd",
    name: "Ready Or Not 2.0 (with Double Down)",
    welcome_phases: welcomePhases,
    rounds: [
        {
            id: "round1",
            name: "Round 1: Years 1 & 2",
            year_label: "Years 1 & 2",
            phases: round1Phases
        },
        {
            id: "round2",
            name: "Round 2: Years 3 & 4",
            year_label: "Years 3 & 4",
            phases: round2Phases
        },
        {
            id: "round3",
            name: "Round 3: Year 5",
            year_label: "Year 5",
            phases: round3Phases
        },
    ],
    game_end_phases: gameEndPhases,
    slides: allGameSlides, // Now correctly imports from SlideContent
    all_investment_options: allInvestmentOptionsData, // Now correctly imports from InvestmentOptions
    all_challenge_options: allChallengeOptionsData, // Now correctly imports from ChallengeOptions
    investment_phase_budgets: {
        'rd1-invest': 250000,
        'rd2-invest': 500000,
        'rd3-invest': 600000,
    },
    all_consequences: allConsequencesData, // Now correctly imports from ConsequenceContent
    all_investment_payoffs: allInvestmentPayoffsData, // Now correctly imports from InvestmentPayoffContent
    allPhases: [
        ...welcomePhases,
        ...round1Phases,
        ...round2Phases,
        ...round3Phases,
        ...gameEndPhases
    ]
};