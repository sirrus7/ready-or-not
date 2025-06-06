// src/views/team/components/InteractionPanel/DecisionContainer.tsx - Complete integration
import React, {useMemo} from 'react';
import DecisionPanel from '@views/team/components/DecisionForms/DecisionPanel';
import {GamePhaseNode, GameStructure} from '@shared/types';

interface DecisionModeContainerProps {
    sessionId: string;
    teamId: string;
    currentPhase: GamePhaseNode | null;
    timeRemainingSeconds: number | undefined;
    gameStructure: GameStructure;
    decisionOptionsKey: string | undefined;
}

const DecisionModeContainer: React.FC<DecisionModeContainerProps> = ({
                                                                         sessionId,
                                                                         teamId,
                                                                         currentPhase,
                                                                         timeRemainingSeconds,
                                                                         gameStructure,
                                                                         decisionOptionsKey
                                                                     }) => {
    if (!currentPhase) {
        return (
            <div className="flex-1 p-3 md:p-4 flex items-center justify-center">
                <div className="text-center text-gray-400">
                    <p className="text-lg">No active phase</p>
                    <p className="text-sm mt-1">Waiting for facilitator...</p>
                </div>
            </div>
        );
    }

    // Compute phase-specific options and budgets
    const phaseData = useMemo(() => {
        const dataKey = decisionOptionsKey || currentPhase.id;

        const investmentOptions = currentPhase.phase_type === 'invest' && dataKey ?
            gameStructure.all_investment_options[dataKey] || [] : [];

        const challengeOptions = (currentPhase.phase_type === 'choice' || currentPhase.phase_type === 'double-down-prompt') && dataKey ?
            gameStructure.all_challenge_options[dataKey] || [] : [];

        const rd3Investments = currentPhase.phase_type === 'double-down-select' ?
            gameStructure.all_investment_options['rd3-invest'] || [] : [];

        const budgetForPhase = currentPhase.phase_type === 'invest' && dataKey ?
            gameStructure.investment_phase_budgets[dataKey] || 0 : 0;

        console.log('[DecisionContainer] Phase data computed:', {
            phaseType: currentPhase.phase_type,
            dataKey,
            investmentCount: investmentOptions.length,
            challengeCount: challengeOptions.length,
            rd3Count: rd3Investments.length,
            budget: budgetForPhase
        });

        return {
            investmentOptions,
            challengeOptions,
            rd3Investments,
            budgetForPhase
        };
    }, [currentPhase, decisionOptionsKey, gameStructure]);

    return (
        <div className="flex-1 p-3 md:p-4">
            <DecisionPanel
                sessionId={sessionId}
                teamId={teamId}
                currentPhase={currentPhase}
                investmentOptions={phaseData.investmentOptions}
                investUpToBudget={phaseData.budgetForPhase}
                challengeOptions={phaseData.challengeOptions}
                availableRd3Investments={phaseData.rd3Investments}
                isDecisionTime={true} // Container only renders when decisions are active
                timeRemainingSeconds={timeRemainingSeconds}
            />
        </div>
    );
};

export default DecisionModeContainer;
