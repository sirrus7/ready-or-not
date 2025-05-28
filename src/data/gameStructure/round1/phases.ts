// src/data/gameStructure/round1/phases.ts
import { GamePhaseNode } from '../../../types';

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