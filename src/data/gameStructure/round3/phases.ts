// src/data/gameStructure/round3/phases.ts
import { GamePhaseNode } from '../../../types';

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
        label: "RD-3 KPIs",
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