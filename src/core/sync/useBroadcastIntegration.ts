// src/hooks/useBroadcastIntegration.ts
import {useEffect} from 'react';
import {useBroadcastManager} from './BroadcastChannel';
import {GamePhaseNode, Slide} from '@shared/types/game';
import {HostBroadcastPayload} from '@shared/types/sync';

interface UseBroadcastIntegrationProps {
    sessionId: string | null;
    currentPhaseNode: GamePhaseNode | null;
    currentSlideData: Slide | null;
    isDecisionPhaseActive: boolean;
    decisionPhaseTimerEndTime: number | undefined;
}

export const useBroadcastIntegration = ({
                                            sessionId,
                                            currentPhaseNode,
                                            currentSlideData,
                                            isDecisionPhaseActive,
                                            decisionPhaseTimerEndTime
                                        }: UseBroadcastIntegrationProps) => {
    const broadcastManager = useBroadcastManager(sessionId, 'host');

    // Broadcast teacher state changes to student devices
    useEffect(() => {
        if (!broadcastManager || !currentPhaseNode || !currentSlideData) {
            return;
        }

        const currentPhase = currentPhaseNode;
        const currentSlide = currentSlideData;

        // Create teacher broadcast payload
        const teacherPayload: HostBroadcastPayload = {
            currentSlideId: currentSlide.id,
            currentPhaseId: currentPhase.id,
            currentPhaseType: currentPhase.phase_type,
            currentRoundNumber: currentPhase.round_number,
            isPlayingVideo: false, // This will be managed by video components
            isDecisionPhaseActive: isDecisionPhaseActive,
            decisionOptionsKey: currentPhase.interactive_data_key || currentPhase.id,
            decisionPhaseTimerEndTime: decisionPhaseTimerEndTime,
        };

        console.log('[useBroadcastIntegration] Broadcasting teacher state update:', teacherPayload);
        broadcastManager.sendTeacherStateUpdate(teacherPayload);

    }, [
        broadcastManager,
        currentPhaseNode,
        currentSlideData,
        isDecisionPhaseActive,
        decisionPhaseTimerEndTime
    ]);

    return {
        broadcastManager
    };
};
