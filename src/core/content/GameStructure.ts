// src/core/content/GameStructure.ts
import {GameStructure, Slide} from '@shared/types/game';
import {allGameSlides} from './SlideContent';
import {allInvestmentOptionsData} from './InvestmentOptions';
import {allChallengeOptionsData} from './ChallengeOptions';
import {allConsequencesData} from './ConsequenceContent';
import {allInvestmentPayoffsData} from './InvestmentPayoffContent';
import {INVESTMENT_PHASE_BUDGETS} from '@shared/utils/budgetUtils';
import {get15Slides} from './SlideContent15';

const interactiveSlides: Slide[] = allGameSlides.filter(
    (slide) => !!slide.interactive_data_key && slide.type.startsWith('interactive_')
);

export const readyOrNotGame_2_0_DD: GameStructure = {
    id: "ready_or_not_2.0_dd",
    name: "Ready Or Not 2.0 (with Double Down)",
    slides: allGameSlides,
    interactive_slides: interactiveSlides,
    all_investment_options: allInvestmentOptionsData,
    all_challenge_options: allChallengeOptionsData,
    all_consequences: allConsequencesData,
    all_investment_payoffs: allInvestmentPayoffsData,
    investment_phase_budgets: INVESTMENT_PHASE_BUDGETS,
};

// Add this function to filter out double down slides
export const getFilteredSlides = (gameVersion: string): Slide[] => {
    if (gameVersion === '2.0_no_dd') {
        // Filter out double down slides
        return allGameSlides.filter(slide => {
            // Remove the double down selection slide (slide 144)
            if (slide.id === 144 && slide.type === 'interactive_double_down_select') return false;

            // Remove double down payoff intro slide
            if (slide.id === 184) return false;

            // Remove double down dice roll slides (slides 185-194)
            return slide.type !== 'double_down_dice_roll';

        });
    }
    return allGameSlides;
};

// Add new game structure export
export const readyOrNotGame_2_0_NO_DD: GameStructure = {
    id: "ready_or_not_2.0_no_dd",
    name: "Ready Or Not 2.0 (without Double Down)",
    slides: getFilteredSlides('2.0_no_dd'),
    interactive_slides: getFilteredSlides('2.0_no_dd').filter(
        (slide) => !!slide.interactive_data_key && slide.type.startsWith('interactive_')
    ),
    all_investment_options: allInvestmentOptionsData,
    all_challenge_options: allChallengeOptionsData,
    all_consequences: allConsequencesData,
    all_investment_payoffs: allInvestmentPayoffsData,
    investment_phase_budgets: INVESTMENT_PHASE_BUDGETS,
};

// Add the new 1.5 GameStructure export
export const readyOrNotGame_1_5: GameStructure = {
    id: "ready_or_not_1.5",
    name: "Ready Or Not 1.5 (without virtual host)",
    slides: get15Slides(),
    interactive_slides: get15Slides().filter(
        (slide) => !!slide.interactive_data_key && slide.type.startsWith('interactive_')
    ),
    all_investment_options: allInvestmentOptionsData,
    all_challenge_options: allChallengeOptionsData,
    all_consequences: allConsequencesData,
    all_investment_payoffs: allInvestmentPayoffsData,
    investment_phase_budgets: INVESTMENT_PHASE_BUDGETS,
};
