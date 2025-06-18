// src/core/game/useGameController.ts
// FINAL FIX: Prevent infinite loop with persistent slide tracking using localStorage

import {useCallback, useEffect, useMemo, useState} from 'react';
import {GameSessionManager} from '@core/game/GameSessionManager';
import {GameStructure, GameSession, Slide} from '@shared/types';
import {useSlidePreCaching} from '@shared/hooks/useSlidePreCaching';

export const useGameController = (
    initialDbSession: GameSession | null,
    gameStructure: GameStructure | null,
    processInteractiveSlide: (completedSlide: Slide) => Promise<void>,
    processConsequenceSlide: (consequenceSlide: Slide) => Promise<void>
) => {
    // STATE MANAGEMENT
    const [dbSession, setDbSession] = useState<GameSession | null>(initialDbSession);
    const [hostNotesState, setHostNotesState] = useState<Record<number, string>>({});
    const [currentHostAlertState, setCurrentHostAlertState] = useState<{ title: string; message: string } | null>(null);
    const [allTeamsSubmittedState, setAllTeamsSubmittedCurrentInteractivePhase] = useState<boolean>(false);
    const [allTeamsAlertDismissed, setAllTeamsAlertDismissed] = useState<boolean>(false);

    // CRITICAL FIX: Use sessionStorage for persistent slide tracking across re-renders
    const getProcessedSlidesKey = (sessionId: string) => `processed_consequence_slides_${sessionId}`;

    const getProcessedSlides = useCallback((): Set<number> => {
        if (!dbSession?.id) return new Set();
        try {
            const stored = sessionStorage.getItem(getProcessedSlidesKey(dbSession.id));
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch {
            return new Set();
        }
    }, [dbSession?.id]);

    const setProcessedSlides = useCallback((slides: Set<number>) => {
        if (!dbSession?.id) return;
        try {
            sessionStorage.setItem(getProcessedSlidesKey(dbSession.id), JSON.stringify([...slides]));
        } catch (error) {
            console.warn('[useGameController] Failed to persist processed slides:', error);
        }
    }, [dbSession?.id]);

    const addProcessedSlide = useCallback((slideId: number) => {
        const current = getProcessedSlides();
        current.add(slideId);
        setProcessedSlides(current);
    }, [getProcessedSlides, setProcessedSlides]);

    const hasProcessedSlide = useCallback((slideId: number): boolean => {
        return getProcessedSlides().has(slideId);
    }, [getProcessedSlides]);

    // CONSTANTS
    const ALL_SUBMIT_ALERT_TITLE = "All Teams Have Submitted!";
    const ALL_SUBMIT_ALERT_MESSAGE = "All teams have submitted their decisions for this challenge. Click OK to proceed to the next slide, then click Next to proceed.";

    // SESSION MANAGEMENT
    useEffect(() => {
        if (initialDbSession && !dbSession) {
            setDbSession(initialDbSession);
        }
    }, [dbSession, initialDbSession]);

    // CRITICAL FIX: Clear processed slides when session changes
    useEffect(() => {
        if (initialDbSession?.id !== dbSession?.id && initialDbSession?.id) {
            try {
                // Clear processed slides for new session
                sessionStorage.removeItem(getProcessedSlidesKey(initialDbSession.id));
                console.log('[useGameController] 🔄 Cleared processed slides for new session');
            } catch (error) {
                console.warn('[useGameController] Failed to clear processed slides:', error);
            }
        }
    }, [initialDbSession?.id, dbSession?.id]);

    const sessionManager = useMemo(() => GameSessionManager.getInstance(), []);

    // COMPUTED VALUES
    const currentSlideIndex = useMemo(() => dbSession?.current_slide_index ?? null, [dbSession]);
    const currentSlideData = useMemo(() => {
        if (gameStructure && currentSlideIndex !== null) {
            return gameStructure.slides[currentSlideIndex] ?? null;
        }
        return null;
    }, [gameStructure, currentSlideIndex]);

    // SLIDE PRECACHING
    useSlidePreCaching(
        gameStructure?.slides ?? [],
        currentSlideIndex,
        {
            precacheCount: 3,
            enabled: !!currentSlideData?.source_path
        }
    );

    // INITIALIZE HOST NOTES
    useEffect(() => {
        if (dbSession?.host_notes) {
            setHostNotesState(dbSession.host_notes);
        }
    }, [dbSession?.host_notes]);

    // AUTO-SHOW "ALL TEAMS SUBMITTED" ALERT
    useEffect(() => {
        if (allTeamsSubmittedState &&
            currentSlideData?.interactive_data_key &&
            !currentHostAlertState &&
            !allTeamsAlertDismissed) {
            console.log('[useGameController] All teams submitted, showing alert');
            setCurrentHostAlertState({
                title: ALL_SUBMIT_ALERT_TITLE,
                message: ALL_SUBMIT_ALERT_MESSAGE
            });
        }
    }, [allTeamsSubmittedState, currentSlideData?.interactive_data_key, currentHostAlertState, allTeamsAlertDismissed]);

    // CRITICAL FIX: Auto-process consequence slides with persistent tracking
    useEffect(() => {
        if (!currentSlideData || !gameStructure || !dbSession?.id) return;

        const processConsequenceSlideAuto = async () => {
            if (currentSlideData.type === 'consequence_reveal') {
                // CRITICAL FIX: Check persistent storage for already processed slides
                if (hasProcessedSlide(currentSlideData.id)) {
                    console.log(`[useGameController] 🟡 Consequence slide ${currentSlideData.id} already auto-processed (persistent), skipping`);
                    return;
                }

                console.log(`[useGameController] 🎯 Auto-processing consequence slide: ${currentSlideData.id}`);

                try {
                    // Mark as processed BEFORE processing to prevent re-entry
                    addProcessedSlide(currentSlideData.id);

                    await processConsequenceSlide(currentSlideData);

                    console.log(`[useGameController] ✅ Successfully auto-processed consequence slide: ${currentSlideData.id}`);
                } catch (error) {
                    console.error(`[useGameController] ❌ Error auto-processing consequence slide:`, error);

                    // Remove from processed set on error so it can be retried
                    const current = getProcessedSlides();
                    current.delete(currentSlideData.id);
                    setProcessedSlides(current);

                    setCurrentHostAlertState({
                        title: "Processing Error",
                        message: `Failed to process consequence slide: ${error instanceof Error ? error.message : "Unknown error"}`
                    });
                }
            }
        };

        processConsequenceSlideAuto();
    }, [currentSlideData?.id, currentSlideData?.type, gameStructure, processConsequenceSlide, dbSession?.id, hasProcessedSlide, addProcessedSlide, getProcessedSlides, setProcessedSlides]);

    // HOST ALERT MANAGEMENT
    const clearHostAlert = useCallback(async () => {
        if (!currentHostAlertState || !dbSession) return;

        const isAllSubmitAlert = currentHostAlertState.title === ALL_SUBMIT_ALERT_TITLE;

        setCurrentHostAlertState(null);

        if (isAllSubmitAlert) {
            setAllTeamsAlertDismissed(true);
            try {
                const nextSlideIndex = Math.min((dbSession.current_slide_index ?? 0) + 1, (gameStructure?.slides.length ?? 1) - 1);
                await sessionManager.updateSession(dbSession.id, {current_slide_index: nextSlideIndex});
                setDbSession(prev => prev ? {...prev, current_slide_index: nextSlideIndex} : null);
                console.log(`[useGameController] Advanced to slide ${nextSlideIndex} after all teams submitted alert`);
            } catch (error) {
                console.error('[useGameController] Error advancing slide after alert:', error);
                setCurrentHostAlertState({
                    title: "Navigation Error",
                    message: error instanceof Error ? error.message : "Failed to change slide."
                });
            }
        }
    }, [dbSession, sessionManager, gameStructure, currentHostAlertState, ALL_SUBMIT_ALERT_TITLE]);

    // SLIDE NAVIGATION METHODS
    const nextSlide = useCallback(async () => {
        if (currentSlideIndex === null || !currentSlideData) {
            console.warn('[useGameController] Cannot advance: No current slide');
            return;
        }

        console.log(`[useGameController] Advancing from slide ${currentSlideIndex}`);

        // Process interactive slides on completion
        if (currentSlideData.interactive_data_key && currentSlideData.type.startsWith('interactive_')) {
            try {
                console.log(`[useGameController] Processing interactive slide: ${currentSlideData.id}`);
                await processInteractiveSlide(currentSlideData);
            } catch (error) {
                console.error('[useGameController] Error processing interactive slide:', error);
                setCurrentHostAlertState({
                    title: "Processing Error",
                    message: `Failed to process slide: ${error instanceof Error ? error.message : "Unknown error"}`
                });
                return;
            }
        }

        // Navigate to next slide
        try {
            const nextIndex = currentSlideIndex + 1;
            const maxIndex = (gameStructure?.slides.length ?? 1) - 1;

            if (nextIndex <= maxIndex) {
                await sessionManager.updateSession(dbSession!.id, {current_slide_index: nextIndex});
                setDbSession(prev => prev ? {...prev, current_slide_index: nextIndex} : null);
                console.log(`[useGameController] Advanced to slide ${nextIndex}`);

                // Reset alert dismissal state for new slide
                setAllTeamsAlertDismissed(false);
            } else {
                console.log('[useGameController] Already at last slide');
            }
        } catch (error) {
            console.error('[useGameController] Error advancing slide:', error);
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: error instanceof Error ? error.message : "Failed to advance slide."
            });
        }
    }, [currentSlideIndex, currentSlideData, dbSession, sessionManager, gameStructure, processInteractiveSlide]);

    const previousSlide = useCallback(async () => {
        if (currentSlideIndex === null || !dbSession) {
            console.warn('[useGameController] Cannot go back: No current slide or session');
            return;
        }

        console.log(`[useGameController] Going back from slide ${currentSlideIndex}`);

        try {
            const prevIndex = Math.max(currentSlideIndex - 1, 0);
            await sessionManager.updateSession(dbSession.id, {current_slide_index: prevIndex});
            setDbSession(prev => prev ? {...prev, current_slide_index: prevIndex} : null);
            console.log(`[useGameController] Went back to slide ${prevIndex}`);

            // Reset alert dismissal state for new slide
            setAllTeamsAlertDismissed(false);
        } catch (error) {
            console.error('[useGameController] Error going to previous slide:', error);
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: error instanceof Error ? error.message : "Failed to go to previous slide."
            });
        }
    }, [currentSlideIndex, dbSession, sessionManager]);

    const selectSlideByIndex = useCallback(async (targetIndex: number) => {
        if (!dbSession || targetIndex < 0 || targetIndex >= (gameStructure?.slides.length ?? 0)) {
            console.warn('[useGameController] Invalid slide index or no session');
            return;
        }

        console.log(`[useGameController] Jumping to slide ${targetIndex}`);

        try {
            await sessionManager.updateSession(dbSession.id, {current_slide_index: targetIndex});
            setDbSession(prev => prev ? {...prev, current_slide_index: targetIndex} : null);
            console.log(`[useGameController] Jumped to slide ${targetIndex}`);

            // Reset alert dismissal state for new slide
            setAllTeamsAlertDismissed(false);
        } catch (error) {
            console.error('[useGameController] Error jumping to slide:', error);
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: error instanceof Error ? error.message : "Failed to jump to slide."
            });
        }
    }, [dbSession, sessionManager, gameStructure]);

    // HOST NOTES MANAGEMENT
    const updateHostNotesForCurrentSlide = useCallback((notes: string) => {
        if (currentSlideIndex === null) return;

        const updatedNotes = {...hostNotesState, [currentSlideIndex]: notes};
        setHostNotesState(updatedNotes);

        // Update in database
        if (dbSession?.id) {
            sessionManager.updateSession(dbSession.id, {host_notes: updatedNotes})
                .catch(error => console.error('Error updating host notes:', error));
        }
    }, [currentSlideIndex, hostNotesState, dbSession, sessionManager]);

    // COMPUTED PROPERTIES
    const hostNotes = useMemo(() => {
        if (currentSlideIndex === null) return '';
        return hostNotesState[currentSlideIndex] || '';
    }, [currentSlideIndex, hostNotesState]);

    const isFirstSlide = useMemo(() => currentSlideIndex === 0, [currentSlideIndex]);
    const isLastSlide = useMemo(() => {
        const totalSlides = gameStructure?.slides.length ?? 0;
        return currentSlideIndex === totalSlides - 1;
    }, [currentSlideIndex, gameStructure]);

    return {
        // Core slide data
        currentSlideData,
        currentSlideIndex,

        // Navigation
        nextSlide,
        previousSlide,
        selectSlideByIndex,
        isFirstSlide,
        isLastSlide,

        // Host features
        hostNotes,
        updateHostNotesForCurrentSlide,
        currentHostAlert: currentHostAlertState,
        setCurrentHostAlertState,
        clearHostAlert,

        // Team interaction
        setAllTeamsSubmittedCurrentInteractivePhase: setAllTeamsSubmittedCurrentInteractivePhase,
        allTeamsSubmittedCurrentInteractivePhase: allTeamsSubmittedState,
    };
};
