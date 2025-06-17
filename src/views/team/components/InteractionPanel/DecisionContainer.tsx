// src/views/team/components/InteractionPanel/DecisionContainer.tsx
// UPDATED VERSION - Passes decision reset trigger to DecisionPanel
import React, {useMemo} from 'react';
import DecisionPanel from '@views/team/components/DecisionForms/DecisionPanel';
import {Slide, GameStructure} from '@shared/types';

interface DecisionModeContainerProps {
    sessionId: string;
    teamId: string;
    currentSlide: Slide | null;
    gameStructure: GameStructure;
    decisionResetTrigger?: number; // NEW: Reset trigger from useTeamGameState
}

const DecisionModeContainer: React.FC<DecisionModeContainerProps> = ({
                                                                         sessionId,
                                                                         teamId,
                                                                         currentSlide,
                                                                         gameStructure,
                                                                         decisionResetTrigger = 0 // NEW: Default to 0
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
        const dataKey = currentSlide.interactive_data_key;
        if (!dataKey) return {investmentOptions: [], challengeOptions: [], rd3Investments: [], budgetForPhase: 0};

        const investmentOptions = currentSlide.type === 'interactive_invest' ? gameStructure.all_investment_options[dataKey] || [] : [];
        const challengeOptions = (currentSlide.type === 'interactive_choice' || currentSlide.type === 'interactive_double_down_prompt') ? gameStructure.all_challenge_options[dataKey] || [] : [];
        const rd3Investments = currentSlide.type === 'interactive_double_down_select' ? gameStructure.all_investment_options['rd3-invest'] || [] : [];
        const budgetForPhase = currentSlide.type === 'interactive_invest' ? gameStructure.investment_phase_budgets[dataKey] || 0 : 0;

        return {investmentOptions, challengeOptions, rd3Investments, budgetForPhase};
    }, [currentSlide, gameStructure]);

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
                decisionResetTrigger={decisionResetTrigger} // NEW: Pass the reset trigger
            />
        </div>
    );
};

export default DecisionModeContainer;
