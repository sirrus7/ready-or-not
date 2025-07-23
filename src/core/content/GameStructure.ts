// src/core/content/GameStructure.ts
import {GameStructure, Slide} from '@shared/types/game';
import {allGameSlides} from './SlideContent';
import {allInvestmentOptionsData} from './InvestmentOptions';
import {allChallengeOptionsData} from './ChallengeOptions';
import {allConsequencesData} from './ConsequenceContent';
import {allInvestmentPayoffsData} from './InvestmentPayoffContent';
import {INVESTMENT_PHASE_BUDGETS} from '@shared/utils/budgetUtils';

const cachedStructures: Record<string, GameStructure> = {};

export function getFilteredSlides(gameVersion: string, userType: 'business' | 'academic'): Slide[] {
    let slides = allGameSlides;
    if (gameVersion === '2.0_no_dd') {
        slides = slides.filter(slide => {
            if (slide.id === 144 && slide.type === 'interactive_double_down_select') return false;
            if (slide.id === 184) return false;
            return slide.type !== 'double_down_dice_roll';
        });
    }
    // Business users see slide 198, academic users do not
    if (userType === 'academic') {
        slides = slides.filter(slide => slide.id !== 198);
    }
    return slides;
}

export function getGameStructure(gameVersion: string, userType: 'business' | 'academic'): GameStructure {
    const cacheKey = `${gameVersion}_${userType}`;
    if (cachedStructures[cacheKey]) return cachedStructures[cacheKey];

    const slides = getFilteredSlides(gameVersion, userType);
    const interactiveSlides = slides.filter(
        (slide) => !!slide.interactive_data_key && slide.type.startsWith('interactive_')
    );

    const structure: GameStructure = {
        id: `ready_or_not_${gameVersion}_${userType}`,
        name: `Ready Or Not ${gameVersion} (${userType})`,
        slides,
        interactive_slides: interactiveSlides,
        all_investment_options: allInvestmentOptionsData,
        all_challenge_options: allChallengeOptionsData,
        all_consequences: allConsequencesData,
        all_investment_payoffs: allInvestmentPayoffsData,
        investment_phase_budgets: INVESTMENT_PHASE_BUDGETS,
    };
    cachedStructures[cacheKey] = structure;
    return structure;
}

// Keep these for backward compatibility
export const readyOrNotGame_2_0_DD: GameStructure = getGameStructure('2.0_dd', 'academic');
export const readyOrNotGame_2_0_NO_DD: GameStructure = getGameStructure('2.0_no_dd', 'academic');