// src/views/team/components/InteractionPanel/DecisionContainer.tsx
// VERIFIED: Ensures sessionId and teamId are passed to DecisionPanel
import React, {useMemo} from 'react';
import DecisionPanel from '@views/team/components/DecisionForms/DecisionPanel';
import {Slide, GameStructure} from '@shared/types';
import {InteractiveSlideData} from "@core/sync/SimpleRealtimeManager";

interface DecisionModeContainerProps {
    sessionId: string;
    teamId: string;
    currentSlide: Slide | null;
    gameStructure: GameStructure;
    interactiveData: InteractiveSlideData | null;
    decisionResetTrigger?: number;
    onDecisionSubmitted?: () => void;
}

const DecisionModeContainer: React.FC<DecisionModeContainerProps> = ({
                                                                         sessionId,
                                                                         teamId,
                                                                         currentSlide,
                                                                         gameStructure,
                                                                         interactiveData,
                                                                         decisionResetTrigger = 0,
                                                                         onDecisionSubmitted
                                                                     }) => {
    if (!currentSlide) {
        return (
            <div className="flex-1 p-3 md:p-4 flex items-center justify-center">
                <div className="text-center text-gray-400">
                    <p className="text-lg">No active decision</p>
                    <p className="text-sm mt-1">Waiting for facilitator...</p>
                </div>
            </div>
        );
    }

    const phaseData = useMemo(() => {
        if (!currentSlide || !gameStructure) return { investmentOptions: [], challengeOptions: [], rd3Investments: [], budgetForPhase: 0 };

        const dataKey = currentSlide.interactive_data_key || '';

        // NEW: Use realtime data if available and matches current slide
        if (interactiveData && interactiveData.slideId === currentSlide.id) {
            console.log(`[DecisionContainer] Using realtime data for slide ${currentSlide.id}`);
            return {
                investmentOptions: interactiveData.investmentOptions || [],
                challengeOptions: interactiveData.challengeOptions || [],
                rd3Investments: interactiveData.rd3Investments || [],
                budgetForPhase: interactiveData.budgetForPhase || 0
            };
        }

        // EXISTING: Fallback to database data (your original logic)
        console.log(`[DecisionContainer] Using fallback database data for slide ${currentSlide.id}`);

        const investmentOptions = currentSlide.type === 'interactive_invest' ?
            (interactiveData?.investmentOptions || gameStructure.all_investment_options[dataKey] || []) :
            currentSlide.type === 'interactive_double_down_select' ?
                (interactiveData?.rd3Investments || gameStructure.all_investment_options['rd3-invest'] || []) :
                [];

        const challengeOptions = (currentSlide.type === 'interactive_choice' || currentSlide.type === 'interactive_double_down_select') ?
            (interactiveData?.challengeOptions || gameStructure.all_challenge_options[dataKey] || []) : [];

        const rd3Investments = currentSlide.type === 'interactive_double_down_select' ?
            gameStructure.all_investment_options['rd3-invest'] || [] : [];

        const budgetForPhase = currentSlide.type === 'interactive_invest' ?
            gameStructure.investment_phase_budgets[dataKey] || 0 : 0;

        return {investmentOptions, challengeOptions, rd3Investments, budgetForPhase};
    }, [currentSlide, gameStructure, interactiveData]);

    return (
        <div className="flex-1 p-3 md:p-4">
            <DecisionPanel
                sessionId={sessionId}
                teamId={teamId}
                currentSlide={currentSlide}
                investmentOptions={phaseData.investmentOptions}
                investUpToBudget={phaseData.budgetForPhase}
                challengeOptions={phaseData.challengeOptions}
                availableRd3Investments={phaseData.rd3Investments}
                isDecisionTime={true}
                gameStructure={gameStructure}
                decisionResetTrigger={decisionResetTrigger}
                onDecisionSubmitted={onDecisionSubmitted}
            />
        </div>
    );
};

export default DecisionModeContainer;
