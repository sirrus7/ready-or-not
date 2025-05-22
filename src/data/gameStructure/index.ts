// src/data/gameStructure/index.ts
import { GameStructure } from '../../types';
import { welcomeSlides, welcomePhases } from './welcome';
import { round1Slides, round1Phases, round1InvestmentOptions, round1ChallengeOptions, round1Consequences, round1InvestmentPayoffs } from './round1';
import { round2Slides, round2Phases, round2InvestmentOptions, round2ChallengeOptions, round2Consequences, round2InvestmentPayoffs } from './round2';
import { round3Slides, round3Phases, round3InvestmentOptions, round3ChallengeOptions, round3Consequences, round3InvestmentPayoffs } from './round3';
import { gameEndSlides, gameEndPhases } from './gameEnd';

// Combine all slides
export const masterSlides = [
    ...welcomeSlides,
    ...round1Slides,
    ...round2Slides,
    ...round3Slides,
    ...gameEndSlides
];

// Combine all phases
const allPhases = [
    ...welcomePhases,
    ...round1Phases,
    ...round2Phases,
    ...round3Phases,
    ...gameEndPhases
];

// Combine all investment options
const allInvestmentOptions = {
    'rd1-invest': round1InvestmentOptions['rd1-invest'],
    'rd2-invest': round2InvestmentOptions['rd2-invest'],
    'rd3-invest': round3InvestmentOptions['rd3-invest'],
};

// Combine all challenge options
const allChallengeOptions = {
    ...round1ChallengeOptions,
    ...round2ChallengeOptions,
    ...round3ChallengeOptions,
};

// Combine all consequences
const allConsequences = {
    ...round1Consequences,
    ...round2Consequences,
    ...round3Consequences,
};

// Combine all investment payoffs
const allInvestmentPayoffs = {
    'rd1-payoff': round1InvestmentPayoffs['rd1-payoff'],
    'rd2-payoff': round2InvestmentPayoffs['rd2-payoff'],
    'rd3-payoff': round3InvestmentPayoffs['rd3-payoff'],
    'dd-payoff': round3InvestmentPayoffs['dd-payoff'] || [],
};

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
    slides: masterSlides,
    all_investment_options: allInvestmentOptions,
    all_challenge_options: allChallengeOptions,
    investment_phase_budgets: {
        'rd1-invest': 250000,
        'rd2-invest': 500000,
        'rd3-invest': 600000,
    },
    all_consequences: allConsequences,
    all_investment_payoffs: allInvestmentPayoffs,
    allPhases: allPhases
};