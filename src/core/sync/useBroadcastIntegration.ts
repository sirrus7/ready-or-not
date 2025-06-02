// src/core/sync/useBroadcastIntegration.ts
import {useEffect} from 'react';
import {GamePhaseNode, Slide} from '@shared/types/game';
import {HostBroadcastPayload} from '@shared/types/sync';
import {VideoSyncManager} from './VideoSyncManager'; // Correct import for the centralized video sync manager

/**
 * Props for the `useBroadcastIntegration` hook.
 */
interface UseBroadcastIntegrationProps {
    sessionId: string | null;
    currentPhaseNode: GamePhaseNode | null;
    currentSlideData: Slide | null;
    isDecisionPhaseActive: boolean;
    decisionPhaseTimerEndTime: number | undefined;
}

/**
 * `useBroadcastIntegration` is a React hook used by the host to broadcast
 * its current game state to all connected student and presentation displays.
 * It leverages the `VideoSyncManager` to send `teacher_state_update` messages.
 */
export const useBroadcastIntegration = ({
                                            sessionId,
                                            currentPhaseNode,
                                            currentSlideData,
                                            isDecisionPhaseActive,
                                            decisionPhaseTimerEndTime
                                        }: UseBroadcastIntegrationProps) => {
    // Get the singleton instance of VideoSyncManager for the current session.
    // It will be null if no session ID is provided, meaning the host is not in an active game.
    const videoSyncManager = sessionId ? VideoSyncManager.getInstance(sessionId) : null;

    // Effect to broadcast teacher state changes to student devices and presentation display.
    // This runs whenever the relevant game state dependencies change.
    useEffect(() => {
        // Ensure the video sync manager is available and core game state is loaded.
        if (!videoSyncManager || !currentPhaseNode || !currentSlideData) {
            return;
        }

        const currentPhase = currentPhaseNode;
        const currentSlide = currentSlideData;

        // Construct the payload for the teacher state update.
        // This payload contains all necessary information for connected clients
        // to render the correct content and interaction options.
        const teacherPayload: HostBroadcastPayload = {
            currentSlideId: currentSlide.id,
            currentPhaseId: currentPhase.id,
            currentPhaseType: currentPhase.phase_type,
            currentRoundNumber: currentPhase.round_number,
            isPlayingVideo: false, // Video play state is managed by the VideoSyncManager itself, not directly in this payload.
            isDecisionPhaseActive: isDecisionPhaseActive,
            decisionOptionsKey: currentPhase.interactive_data_key || currentPhase.id, // Key to retrieve options for interactive phases.
            decisionPhaseTimerEndTime: decisionPhaseTimerEndTime, // Timestamp for decision timer.
        };

        console.log('[useBroadcastIntegration] Broadcasting teacher state update:', teacherPayload);
        // Send the payload using the VideoSyncManager.
        videoSyncManager.sendTeacherStateUpdate(teacherPayload);

    }, [
        videoSyncManager, // Dependency: VideoSyncManager instance.
        currentPhaseNode, // Dependency: Current game phase.
        currentSlideData, // Dependency: Current slide data.
        isDecisionPhaseActive, // Dependency: Whether decision phase is active.
        decisionPhaseTimerEndTime // Dependency: End time of decision timer.
    ]);

    // The hook does not return any renderable JSX. It's a side-effect hook.
    // It returns the videoSyncManager instance for potential direct usage in components,
    // although its primary purpose is broadcasting via the useEffect.
    return {
        videoSyncManager
    };
};
