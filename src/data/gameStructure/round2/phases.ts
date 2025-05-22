// src/data/gameStructure/round2/phases.ts
import { GamePhaseNode } from '../../../types';

export const round2Phases: GamePhaseNode[] = [
    {
        id: 'rd2-invest',
        label: "RD-2 INVEST",
        sub_label: "Years 3&4",
        icon_name: 'DollarSign',
        phase_type: 'invest',
        round_number: 2,
        slide_ids: [100, 101],
        is_interactive_student_phase: true,
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
        is_interactive_student_phase: true,
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
        is_interactive_student_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'ch5',
        label: "CHOICE 5",
        sub_label: "Labor Strike",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 2,
        slide_ids: [], // To be added when slides are created
        is_interactive_student_phase: true,
        expected_duration_minutes: 3
    },
    {
        id: 'ch5-conseq',
        label: "CONSEQ.",
        sub_label: "CH5",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 2,
        slide_ids: [], // To be added when slides are created
        is_interactive_student_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'ch6',
        label: "CHOICE 6",
        sub_label: "Market Shift",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 2,
        slide_ids: [], // To be added when slides are created
        is_interactive_student_phase: true,
        expected_duration_minutes: 3
    },
    {
        id: 'ch6-conseq',
        label: "CONSEQ.",
        sub_label: "CH6",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 2,
        slide_ids: [], // To be added when slides are created
        is_interactive_student_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'ch7',
        label: "CHOICE 7",
        sub_label: "Regulation",
        icon_name: 'ListChecks',
        phase_type: 'choice',
        round_number: 2,
        slide_ids: [], // To be added when slides are created
        is_interactive_student_phase: true,
        expected_duration_minutes: 3
    },
    {
        id: 'ch7-conseq',
        label: "CONSEQ.",
        sub_label: "CH7",
        icon_name: 'AlertTriangle',
        phase_type: 'consequence',
        round_number: 2,
        slide_ids: [], // To be added when slides are created
        is_interactive_student_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'rd2-payoff',
        label: "RD-2 PAYOFF",
        icon_name: 'TrendingUp',
        phase_type: 'payoff',
        round_number: 2,
        slide_ids: [120, 121],
        is_interactive_student_phase: false,
        expected_duration_minutes: 5
    },
    {
        id: 'rd2-kpi',
        label: "RD-2 KPIs",
        icon_name: 'BarChart3',
        phase_type: 'kpi',
        round_number: 2,
        slide_ids: [130],
        is_interactive_student_phase: false,
        expected_duration_minutes: 2
    },
    {
        id: 'rd2-leaderboard',
        label: "LEADERBOARD",
        icon_name: 'Trophy',
        phase_type: 'leaderboard',
        round_number: 2,
        slide_ids: [131, 132, 133, 134, 135, 136, 137],
        is_interactive_student_phase: false,
        expected_duration_minutes: 5
    }
];