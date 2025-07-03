// src/core/content/ChallengeRegistry.ts
// PRODUCTION: Single source of truth for all challenge metadata

import {ChallengeMetadata} from '@shared/types/game';

export const CHALLENGE_REGISTRY: Record<string, ChallengeMetadata> = {
    'strategy': {
        id: 'strategy',
        title: 'Business Growth Strategy',
        round: 1, // Can be purchased in RD-1 or RD-2
        impact_card_title: 'STRATEGY',
        impact_card_description: 'By investing in a strategy, you have permanently elevated your company beyond the need to invest again. You\'ll get these KPI impacts at the end of the round to adjust your board.',
        consequence_slides: [] // No consequence slides for investments
    },
    'ch1': {
        id: 'ch1',
        title: 'Equipment Failure',
        round: 1,
        impact_card_title: 'CNC Machine',
        impact_card_description: 'Advanced CNC machine provides enhanced production capabilities for future rounds.',
        consequence_slides: [20, 21, 22, 23]
    },
    'ch2': {
        id: 'ch2',
        title: 'Revenue Tax',
        round: 1,
        impact_card_title: 'Tax Impact',
        impact_card_description: 'Revenue tax policy affects business operations.',
        consequence_slides: [35, 36, 37, 38]
    },
    'ch3': {
        id: 'ch3',
        title: 'Recession Response',
        round: 1,
        impact_card_title: 'Layoff Penalty',
        impact_card_description: 'Workforce reduction has permanent impact on production capacity.',
        consequence_slides: [42, 50, 51, 52, 53]
    },
    'ch4': {
        id: 'ch4',
        title: 'Supply Chain Crisis',
        round: 2,
        impact_card_title: 'Supply Chain Impact',
        impact_card_description: 'Supply chain decisions affect future operations.',
        consequence_slides: [82, 83, 84]
    },
    'ch5': {
        id: 'ch5',
        title: 'Capacity Crisis',
        round: 2,
        impact_card_title: 'Capacity Impact',
        impact_card_description: 'Capacity management decisions have lasting effects.',
        consequence_slides: [86, 93, 94, 95, 96]
    },
    'ch6': {
        id: 'ch6',
        title: 'Quality Crisis',
        round: 2,
        impact_card_title: 'Quality Impact',
        impact_card_description: 'Quality control decisions affect production standards.',
        consequence_slides: [100, 108, 109, 110, 111]
    },
    'ch7': {
        id: 'ch7',
        title: 'Competition Response',
        round: 2,
        impact_card_title: 'Competition Impact',
        impact_card_description: 'Competitive response affects market position.',
        consequence_slides: [120, 121, 122, 123]
    },
    'ch8': {
        id: 'ch8',
        title: 'Cyber Attack',
        round: 3,
        impact_card_title: 'Cyber Security Impact',
        impact_card_description: 'Cyber security decisions have lasting consequences.',
        consequence_slides: [154, 155, 156]
    },
    'ch9': {
        id: 'ch9',
        title: 'ERP Crisis',
        round: 3,
        impact_card_title: 'ERP Impact',
        impact_card_description: 'ERP implementation decisions affect operations.',
        consequence_slides: [166, 167, 168]
    }
};

// PRODUCTION: Build slide-to-challenge mapping from registry
export const SLIDE_TO_CHALLENGE_MAP = new Map<number, string>();

Object.values(CHALLENGE_REGISTRY).forEach(challenge => {
    challenge.consequence_slides.forEach(slideId => {
        SLIDE_TO_CHALLENGE_MAP.set(slideId, challenge.id);
    });
});

// Helper functions
export const getChallengeBySlideId = (slideId: number): ChallengeMetadata | null => {
    const challengeId = SLIDE_TO_CHALLENGE_MAP.get(slideId);
    return challengeId ? CHALLENGE_REGISTRY[challengeId] : null;
};

export const getChallengeById = (challengeId: string): ChallengeMetadata | null => {
    return CHALLENGE_REGISTRY[challengeId] || null;
};
