// src/core/game/useGameController.ts
// FIXED VERSION - Properly handles "All Teams Have Submitted" modal

import {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {GameSession, GameStructure, Slide} from '@shared/types';
import {GameSessionManager} from './GameSessionManager';
import {useSlidePreCaching} from '@shared/hooks/useSlidePreCaching';
import {mediaManager} from '@shared/services/MediaManager';

export interface GameControllerOutput {
    currentSlideIndex: number | null;
    currentSlideData: Slide | null;
    teacherNotes: Record<string, string>;
    currentHostAlert: { title: string; message: string } | null;
    allTeamsSubmittedCurrentInteractivePhase: boolean;
    setAllTeamsSubmittedCurrentInteractivePhase: (submitted: boolean) => void;
    selectSlideByIndex: (index: number) => Promise<void>;
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>;
    updateHostNotesForCurrentSlide: (notes: string) => void;
    clearHostAlert: () => Promise<void>;
    setCurrentHostAlertState: (alert: { title: string; message: string } | null) => void;
}

export const useGameController = (
    initialDbSession: GameSession | null,
    gameStructure: GameStructure | null,
    processInteractiveSlide: (completedSlide: Slide) => Promise<void>,
    processConsequenceSlide: (consequenceSlide: Slide) => Promise<void>
): GameControllerOutput => {
    const [dbSession, setDbSession] = useState<GameSession | null>(initialDbSession);
    const [hostNotesState, setHostNotesState] = useState<Record<string, string>>({});
    const [currentHostAlertState, setCurrentHostAlertState] = useState<{
        title: string;
        message: string
    } | null>(null);
    const [allTeamsSubmittedCurrentInteractivePhaseState, setAllTeamsSubmittedCurrentInteractivePhaseState] = useState<boolean>(false);
    const [allTeamsAlertDismissed, setAllTeamsAlertDismissed] = useState<boolean>(false); // ADDED: Track if alert was dismissed

    const previousSlideIdRef = useRef<number | undefined>(undefined);
    const ALL_SUBMIT_ALERT_TITLE = "All Teams Have Submitted";
    const ALL_SUBMIT_ALERT_MESSAGE = "Please verify all teams are happy with their submission. Then click Next to proceed.";

    useEffect(() => {
        setDbSession(initialDbSession);
    }, [initialDbSession]);

    const sessionManager = useMemo(() => GameSessionManager.getInstance(), []);

    // Get current slide index and data directly from session and game structure.
    const currentSlideIndex = useMemo(() => dbSession?.current_slide_index ?? null, [dbSession]);
    const currentSlideData = useMemo(() => {
        if (gameStructure && currentSlideIndex !== null) {
            return gameStructure.slides[currentSlideIndex] ?? null;
        }
        return null;
    }, [gameStructure, currentSlideIndex]);

    // Add slide precaching - this will automatically precache the next 3 slides
    useSlidePreCaching(
        gameStructure?.slides ?? [],
        currentSlideIndex,
        {
            precacheCount: 3,
            enabled: !!currentSlideData?.source_path
        }
    );

    // Initialize host notes from session
    useEffect(() => {
        if (dbSession?.teacher_notes) {
            setHostNotesState(dbSession.teacher_notes);
        }
    }, [dbSession?.teacher_notes]);

    // FIXED: Handle "All Teams Have Submitted" alert properly with dismissal tracking
    useEffect(() => {
        if (allTeamsSubmittedCurrentInteractivePhaseState &&
            currentSlideData?.interactive_data_key &&
            !currentHostAlertState &&
            !allTeamsAlertDismissed) { // FIXED: Don't show if manually dismissed
            console.log('[useGameController] All teams submitted, showing alert');
            setCurrentHostAlertState({
                title: ALL_SUBMIT_ALERT_TITLE,
                message: ALL_SUBMIT_ALERT_MESSAGE
            });
        }
    }, [allTeamsSubmittedCurrentInteractivePhaseState, currentSlideData?.interactive_data_key, currentHostAlertState, allTeamsAlertDismissed]);

    // Auto-process consequence slides when navigating TO them
    useEffect(() => {
        if (!currentSlideData || !gameStructure) return;

        const processConsequenceSlideAuto = async () => {
            if (currentSlideData.type === 'consequence_reveal') {
                console.log(`[useGameController] Auto-processing consequence slide: ${currentSlideData.id}`);
                try {
                    await processConsequenceSlide(currentSlideData);
                } catch (error) {
                    console.error(`[useGameController] Error auto-processing consequence slide:`, error);
                    setCurrentHostAlertState({
                        title: "Processing Error",
                        message: `Failed to process consequence slide: ${error instanceof Error ? error.message : 'Unknown error'}`
                    });
                }
            }
        };

        // Only process if this is a new slide (not initial load)
        const isNewActualSlide = currentSlideData?.id !== previousSlideIdRef.current && previousSlideIdRef.current !== undefined;
        if (isNewActualSlide) {
            processConsequenceSlideAuto();
        }
        previousSlideIdRef.current = currentSlideData?.id;
    }, [currentSlideData, gameStructure, processConsequenceSlide]);

    // Navigation actions
    const navigateToSlide = useCallback(async (newIndex: number) => {
        if (!dbSession?.id || !gameStructure) return;
        if (newIndex < 0 || newIndex >= gameStructure.slides.length) return;

        try {
            // Immediately precache the slide we're navigating to
            const targetSlide = gameStructure.slides[newIndex];
            if (targetSlide?.source_path) {
                // Start precaching immediately (don't await - let it run in background)
                mediaManager.precacheSingleSlide(targetSlide.source_path)
                    .catch(error => {
                        console.warn(`[useGameController] Failed to precache target slide:`, error);
                    });
            }

            const updatedSession = await sessionManager.updateSession(dbSession.id, {
                current_slide_index: newIndex,
                is_complete: newIndex === gameStructure.slides.length - 1,
            });
            setDbSession(updatedSession);

            // FIXED: Reset both states when navigating away
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
            setAllTeamsAlertDismissed(false); // FIXED: Reset dismissal flag for new slide

            // FIXED: Clear the "All Teams Have Submitted" modal when navigating away
            if (currentHostAlertState?.title === ALL_SUBMIT_ALERT_TITLE) {
                setCurrentHostAlertState(null);
            }
        } catch (error) {
            console.error("[useGameController] Error navigating slide:", error);
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: error instanceof Error ? error.message : "Failed to change slide."
            });
        }
    }, [dbSession, gameStructure, sessionManager]);

    const nextSlide = useCallback(async () => {
        if (currentSlideIndex === null || !currentSlideData) return;

        // FIXED: Only process interactive slides on completion, not consequence slides
        // Consequence slides are now auto-processed when navigating TO them
        if (currentSlideData.interactive_data_key && currentSlideData.type.startsWith('interactive_')) {
            await processInteractiveSlide(currentSlideData);
        }

        await navigateToSlide(currentSlideIndex + 1);
    }, [currentSlideIndex, currentSlideData, navigateToSlide, processInteractiveSlide]);

    const previousSlide = useCallback(async () => {
        if (currentHostAlertState) {
            setCurrentHostAlertState(null);
            return;
        }
        if (currentSlideIndex === null) return;
        await navigateToSlide(currentSlideIndex - 1);
    }, [currentSlideIndex, navigateToSlide, currentHostAlertState]);

    const selectSlideByIndex = useCallback(async (index: number) => {
        await navigateToSlide(index);
    }, [navigateToSlide]);

    // Host notes management
    const updateHostNotesForCurrentSlide = useCallback(async (notes: string) => {
        if (currentSlideData && dbSession?.id) {
            const slideKey = String(currentSlideData.id);
            const newTeacherNotes = {...hostNotesState, [slideKey]: notes};
            setHostNotesState(newTeacherNotes);
            try {
                const updatedSession = await sessionManager.updateTeacherNotes(dbSession.id, newTeacherNotes);
                setDbSession(updatedSession);
            } catch (error) {
                console.error("[useGameController] Error updating teacher notes:", error);
            }
        }
    }, [currentSlideData, dbSession, hostNotesState, sessionManager]);

    // FIXED: Host alert management - separate behavior for "All Teams Have Submitted"
    const clearHostAlert = useCallback(async () => {
        if (!currentHostAlertState) return;

        // Check if this is the "All Teams Have Submitted" alert
        if (currentHostAlertState.title === ALL_SUBMIT_ALERT_TITLE) {
            // For "All Teams Have Submitted", clear the alert first, then move to next slide
            setCurrentHostAlertState(null);
            setAllTeamsAlertDismissed(true); // FIXED: Set dismissed flag to prevent reappearance
            await nextSlide();
        } else {
            // For other alerts, just clear the alert but don't auto-advance
            setCurrentHostAlertState(null);
        }
    }, [currentHostAlertState, nextSlide]);

    const setCurrentHostAlertStateManually = useCallback((alert: { title: string; message: string } | null) => {
        // FIXED: If manually dismissing the "All Teams Have Submitted" alert, set dismissed flag
        if (!alert && currentHostAlertState?.title === ALL_SUBMIT_ALERT_TITLE) {
            setAllTeamsAlertDismissed(true);
        }
        setCurrentHostAlertState(alert);
    }, [currentHostAlertState]);

    return {
        currentSlideIndex,
        currentSlideData,
        teacherNotes: hostNotesState,
        currentHostAlert: currentHostAlertState,
        allTeamsSubmittedCurrentInteractivePhase: allTeamsSubmittedCurrentInteractivePhaseState,
        setAllTeamsSubmittedCurrentInteractivePhase: setAllTeamsSubmittedCurrentInteractivePhaseState,
        selectSlideByIndex,
        nextSlide,
        previousSlide,
        updateHostNotesForCurrentSlide,
        clearHostAlert,
        setCurrentHostAlertState: setCurrentHostAlertStateManually
    };
};
