// src/views/team/components/InteractionPanel/DecisionContainer.tsx
// UPDATED: No GameStructure dependency - teams get all data from host events
import React, {useMemo} from 'react';
import DecisionPanel from '@views/team/components/DecisionForms/DecisionPanel';
import {Slide} from '@shared/types';
import {InteractiveSlideData} from "@core/sync/SimpleRealtimeManager";

interface DecisionModeContainerProps {
    sessionId: string;
    teamId: string;
    currentSlide: Slide | null;
    interactiveData: InteractiveSlideData | null;
    decisionResetTrigger?: number;
    onDecisionSubmitted?: () => void;
}

const DecisionModeContainer: React.FC<DecisionModeContainerProps> = ({
                                                                         sessionId,
                                                                         teamId,
                                                                         currentSlide,
                                                                         interactiveData,
                                                                         decisionResetTrigger = 0,
                                                                         onDecisionSubmitted
                                                                     }) => {
    // ✅ Move useMemo BEFORE any early returns
    const phaseData = useMemo(() => {
        // ✅ Only use realtime data from host - no fallback to GameStructure
        if (!currentSlide || !interactiveData || interactiveData.slideId !== currentSlide.id) {
            console.log(`[DecisionContainer] No interactive data for slide ${currentSlide?.id}, returning empty`);
            return {
                investmentOptions: [],
                challengeOptions: [],
                rd3Investments: [],
                budgetForPhase: 0
            };
        }

        console.log(`[DecisionContainer] Using realtime data for slide ${currentSlide.id}`);
        return {
            investmentOptions: interactiveData.investmentOptions || [],
            challengeOptions: interactiveData.challengeOptions || [],
            rd3Investments: interactiveData.rd3Investments || [],
            budgetForPhase: interactiveData.budgetForPhase || 0
        };
    }, [currentSlide, interactiveData]);

    // ✅ Early return AFTER all hooks
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
                gameStructure={undefined}
                decisionResetTrigger={decisionResetTrigger}
                onDecisionSubmitted={onDecisionSubmitted}
            />
        </div>
    );
};

export default DecisionModeContainer;
