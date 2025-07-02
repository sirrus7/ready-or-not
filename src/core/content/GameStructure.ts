// src/core/content/GameStructure.ts
import {GameStructure, Slide} from '@shared/types/game';
import {allGameSlides} from './SlideContent';
import {allInvestmentOptionsData} from './InvestmentOptions';
import {allChallengeOptionsData} from './ChallengeOptions';
import {allConsequencesData} from './ConsequenceContent';
import {allInvestmentPayoffsData} from './InvestmentPayoffContent';
import {INVESTMENT_PHASE_BUDGETS} from '@shared/utils/budgetUtils';

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