// src/core/interaction/useDecisionPhaseManager.ts
import {useState, useCallback, useEffect} from 'react';
import {GamePhaseNode, Slide} from '@shared/types';
import {InteractionManager} from './InteractionManager';

interface UseDecisionPhaseManagerReturn {
    isDecisionPhaseActive: boolean;
    decisionPhaseTimerEndTime: number | undefined;
    activateDecisionPhase: (durationSeconds?: number) => void;
    deactivateDecisionPhase: () => void;
}

/**
 * useDecisionPhaseManager is a React hook that provides the current state
 * of the interactive decision phase (active/inactive, timer).
 * It is the React-friendly interface to the InteractionManager singleton.
 */
export const useDecisionPhaseManager = (
    currentPhaseNode: GamePhaseNode | null,
    currentSlideData: Slide | null
): UseDecisionPhaseManagerReturn => {
    // Get the singleton instance of InteractionManager
    const interactionManager = InteractionManager.getInstance();

    // State is now managed by the hook, updated via subscriptions to InteractionManager
    const [isDecisionPhaseActive, setIsDecisionPhaseActive] = useState<boolean>(interactionManager.getIsActive());
    const [decisionPhaseTimerEndTime, setDecisionPhaseTimerEndTime] = useState<number | undefined>(interactionManager.getTimerEndTime());

    // Effect to subscribe to InteractionManager's state changes
    useEffect(() => {
        const listener = (isActive: boolean, timerEndTime: number | undefined) => {
            setIsDecisionPhaseActive(isActive);
            setDecisionPhaseTimerEndTime(timerEndTime);
        };

        const unsubscribe = interactionManager.subscribe(listener);

        // Cleanup on unmount
        return () => {
            unsubscribe();
        };
    }, [interactionManager]); // Re-subscribe only if interactionManager instance changes (which it won't as it's a singleton)

    // Effect to automatically start/stop decision phases based on current game state
    useEffect(() => {
        if (!currentPhaseNode || !currentSlideData) return;

        // Determine if the current slide/phase combination means decisions should be active
        const isInteractiveSlide = currentSlideData.type === 'interactive_invest' ||
            currentSlideData.type === 'interactive_choice' ||
            currentSlideData.type === 'interactive_double_down_select';

        const shouldBeActive = isInteractiveSlide && currentPhaseNode.is_interactive_player_phase;

        if (shouldBeActive && !isDecisionPhaseActive) {
            // Auto-activate if it should be active but isn't already
            const timerDuration = currentSlideData.timer_duration_seconds || 300; // Default 5 minutes
            console.log('[useDecisionPhaseManager] Auto-activating decision phase for interactive slide');
            interactionManager.startDecisionPhase(timerDuration);
        } else if (!shouldBeActive && isDecisionPhaseActive) {
            // Auto-deactivate if it should no longer be active but currently is
            console.log('[useDecisionPhaseManager] Auto-deactivating decision phase for non-interactive slide');
            interactionManager.stopDecisionPhase();
        }
        // No need to stop if already active for interactive slide (timer is self-managed by InteractionManager)
        // No need to start if already inactive for non-interactive slide (already stopped)

    }, [currentPhaseNode, currentSlideData, isDecisionPhaseActive, interactionManager]);

    // Expose methods to directly control the decision phase (e.g., from host UI)
    const activateDecisionPhase = useCallback((durationSeconds: number = 300) => {
        interactionManager.startDecisionPhase(durationSeconds);
    }, [interactionManager]);

    const deactivateDecisionPhase = useCallback(() => {
        interactionManager.stopDecisionPhase();
    }, [interactionManager]);

    return {
        isDecisionPhaseActive,
        decisionPhaseTimerEndTime,
        activateDecisionPhase,
        deactivateDecisionPhase
    };
};