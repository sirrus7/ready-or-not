// src/hooks/useDecisionPhaseManager.ts
import { useState, useCallback, useEffect } from 'react';
import { GamePhaseNode, Slide } from '../types';

interface DecisionPhaseState {
    isActive: boolean;
    timerEndTime: number | undefined;
}

interface UseDecisionPhaseManagerReturn {
    isDecisionPhaseActive: boolean;
    decisionPhaseTimerEndTime: number | undefined;
    activateDecisionPhase: (durationSeconds?: number) => void;
    deactivateDecisionPhase: () => void;
}

export const useDecisionPhaseManager = (
    currentPhaseNode: GamePhaseNode | null,
    currentSlideData: Slide | null
): UseDecisionPhaseManagerReturn => {
    const [state, setState] = useState<DecisionPhaseState>({
        isActive: false,
        timerEndTime: undefined
    });

    const activateDecisionPhase = useCallback((durationSeconds: number = 300) => {
        console.log('[useDecisionPhaseManager] Activating decision phase with duration:', durationSeconds);
        const endTime = Date.now() + (durationSeconds * 1000);
        setState({
            isActive: true,
            timerEndTime: endTime
        });
    }, []);

    const deactivateDecisionPhase = useCallback(() => {
        console.log('[useDecisionPhaseManager] Deactivating decision phase');
        setState({
            isActive: false,
            timerEndTime: undefined
        });
    }, []);

    // Auto-activate decision phases for interactive slides
    useEffect(() => {
        if (!currentPhaseNode || !currentSlideData) return;

        // Check if this is an interactive slide that should activate decisions
        const isInteractiveSlide = currentSlideData.type === 'interactive_invest' ||
            currentSlideData.type === 'interactive_choice' ||
            currentSlideData.type === 'interactive_double_down_prompt' ||
            currentSlideData.type === 'interactive_double_down_select';

        if (isInteractiveSlide && currentPhaseNode.is_interactive_player_phase && !state.isActive) {
            const timerDuration = currentSlideData.timer_duration_seconds || 300; // Default 5 minutes
            console.log('[useDecisionPhaseManager] Auto-activating decision phase for interactive slide');
            activateDecisionPhase(timerDuration);
        } else if (!isInteractiveSlide && state.isActive) {
            console.log('[useDecisionPhaseManager] Auto-deactivating decision phase for non-interactive slide');
            deactivateDecisionPhase();
        }
    }, [currentPhaseNode, currentSlideData, state.isActive, activateDecisionPhase, deactivateDecisionPhase]);

    return {
        isDecisionPhaseActive: state.isActive,
        decisionPhaseTimerEndTime: state.timerEndTime,
        activateDecisionPhase,
        deactivateDecisionPhase
    };
};