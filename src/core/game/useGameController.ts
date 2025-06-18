// src/core/game/useGameController.ts
// ULTIMATE FIX: Only process consequence slides when slide actually changes, not on data refresh

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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

    // CRITICAL FIX: Track the last processed slide to prevent re-processing on data refresh
    const lastProcessedSlideRef = useRef<number | null>(null);
    const processingRef = useRef<boolean>(false);

    /**
     * CONTEXTUAL ALERT SYSTEM
     *
     * REQUIREMENTS:
     * 1. Alert should ONLY show if teams have submitted for the CURRENT slide's interactive_data_key
     * 2. Alert should NOT carry over from previous challenges (e.g., Investment → Choice 1)
     * 3. Alert CAN reappear on browser reload if teams have submitted for current slide
     * 4. Alert should NOT appear on new challenges until teams actually submit
     *
     * EXAMPLES:
     * - Investment complete → Navigate to Investment slide → Alert CAN show (teams submitted for "rd1-invest")
     * - Investment complete → Navigate to Choice 1 slide → Alert should NOT show (teams haven't submitted for "ch1_decision")
     * - Choice 1 complete → Navigate to Choice 1 slide → Alert CAN show (teams submitted for "ch1_decision")
     *
     * IMPLEMENTATION:
     * - Track the last interactive_data_key that triggered an alert
     * - Only show alert if teams submitted for the current slide's specific decision key
     * - Reset tracking when moving to different interactive_data_key
     */
    const lastAlertDataKeyRef = useRef<string | null>(null);

    // CONSTANTS
    const ALL_SUBMIT_ALERT_TITLE = "All Teams Have Submitted!";
    const ALL_SUBMIT_ALERT_MESSAGE = "All teams have submitted their decisions for this challenge. Click 'Next' to advance to the next slide, or 'Close' to dismiss this alert and stay on the current slide.";

    // SESSION MANAGEMENT
    useEffect(() => {
        if (initialDbSession && !dbSession) {
            setDbSession(initialDbSession);
        }
    }, [dbSession, initialDbSession]);

    // CRITICAL FIX: Reset processing state when session changes
    useEffect(() => {
        if (initialDbSession?.id !== dbSession?.id) {
            lastProcessedSlideRef.current = null;
            processingRef.current = false;
            console.log('[useGameController] 🔄 Session changed, reset processing state');
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

    /**
     * ENHANCED CONTEXTUAL ALERT DETECTION
     *
     * This useEffect ensures alerts are only shown for submissions relevant to the current slide.
     * It prevents "ghost alerts" from previous challenges appearing on new challenge slides.
     */
    useEffect(() => {
        const currentDataKey = currentSlideData?.interactive_data_key;

        // Early exit if no interactive slide
        if (!currentDataKey) {
            lastAlertDataKeyRef.current = null;
            return;
        }

        // CRITICAL: Reset alert eligibility when moving to a new interactive data key
        if (currentDataKey !== lastAlertDataKeyRef.current) {
            console.log(`[useGameController] 🔄 Interactive data key changed from "${lastAlertDataKeyRef.current}" to "${currentDataKey}"`);

            // Reset tracking for new slide
            lastAlertDataKeyRef.current = currentDataKey;

            // Reset alert dismissed state for new slide (allow alerts to show again)
            if (allTeamsAlertDismissed) {
                console.log('[useGameController] 🔄 Resetting alert dismissed state for new interactive slide');
                setAllTeamsAlertDismissed(false);
                setAllTeamsSubmittedCurrentInteractivePhase(false);
            }
        }

        // SHOW ALERT CONDITIONS:
        // 1. All teams have submitted (for current slide's decision key)
        // 2. We're on an interactive slide (has interactive_data_key)
        // 3. No alert is currently showing
        // 4. Alert hasn't been dismissed for this specific slide
        if (allTeamsSubmittedState &&
            currentDataKey &&
            !currentHostAlertState &&
            !allTeamsAlertDismissed) {

            console.log(`[useGameController] ✅ All teams submitted for "${currentDataKey}", showing alert`);
            setCurrentHostAlertState({
                title: ALL_SUBMIT_ALERT_TITLE,
                message: ALL_SUBMIT_ALERT_MESSAGE
            });
        }

        // DEBUG LOGGING: Help troubleshoot alert logic
        console.log(`[useGameController] 🔍 Alert check for "${currentDataKey}":`, {
            allTeamsSubmitted: allTeamsSubmittedState,
            hasDataKey: !!currentDataKey,
            noCurrentAlert: !currentHostAlertState,
            notDismissed: !allTeamsAlertDismissed,
            willShowAlert: allTeamsSubmittedState && currentDataKey && !currentHostAlertState && !allTeamsAlertDismissed
        });

    }, [
        allTeamsSubmittedState,           // Changes when team submission status changes
        currentSlideData?.interactive_data_key,  // Changes when slide changes
        currentHostAlertState,            // Changes when alert is shown/hidden
        allTeamsAlertDismissed           // Changes when alert is dismissed
    ]);

    // ULTIMATE FIX: Only process consequence slides when slide ID actually changes
    useEffect(() => {
        if (!currentSlideData || !gameStructure || !dbSession?.id) return;

        const processConsequenceSlideAuto = async () => {
            if (currentSlideData.type === 'consequence_reveal') {
                // ULTIMATE FIX: Only process if this is a new slide and we're not already processing
                if (lastProcessedSlideRef.current === currentSlideData.id) {
                    console.log(`[useGameController] ⚪ Consequence slide ${currentSlideData.id} already processed, ignoring data refresh`);
                    return;
                }

                if (processingRef.current) {
                    console.log(`[useGameController] ⏸️ Already processing slide ${currentSlideData.id}, skipping`);
                    return;
                }

                console.log(`[useGameController] 🎯 NEW consequence slide detected: ${currentSlideData.id} (previous: ${lastProcessedSlideRef.current})`);

                try {
                    // Mark as processing to prevent concurrent calls
                    processingRef.current = true;

                    await processConsequenceSlide(currentSlideData);

                    // Mark as processed AFTER successful completion
                    lastProcessedSlideRef.current = currentSlideData.id;

                    console.log(`[useGameController] ✅ Successfully processed NEW consequence slide: ${currentSlideData.id}`);
                } catch (error) {
                    console.error(`[useGameController] ❌ Error processing consequence slide:`, error);

                    // Don't mark as processed on error so it can be retried
                    setCurrentHostAlertState({
                        title: "Processing Error",
                        message: `Failed to process consequence slide: ${error instanceof Error ? error.message : "Unknown error"}`
                    });
                } finally {
                    // Always reset processing flag
                    processingRef.current = false;
                }
            } else {
                // Reset last processed slide when we leave consequence slides
                if (lastProcessedSlideRef.current !== null && currentSlideData.type !== 'consequence_reveal') {
                    console.log(`[useGameController] 🔄 Left consequence slides, resetting processed state`);
                    lastProcessedSlideRef.current = null;
                }
            }
        };

        processConsequenceSlideAuto();
    }, [currentSlideData?.id, currentSlideData?.type, gameStructure, processConsequenceSlide, dbSession?.id]);

    // HOST ALERT MANAGEMENT
    const clearHostAlert = useCallback(async () => {
        if (!currentHostAlertState || !dbSession) return;

        setCurrentHostAlertState(null);
        setAllTeamsAlertDismissed(true);

        // Always advance slide when clearHostAlert is called
        try {
            const nextSlideIndex = Math.min(
                (dbSession.current_slide_index ?? 0) + 1,
                (gameStructure?.slides.length ?? 1) - 1
            );
            await sessionManager.updateSession(dbSession.id, {current_slide_index: nextSlideIndex});
            setDbSession(prev => prev ? {...prev, current_slide_index: nextSlideIndex} : null);
        } catch (error) {
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: "Failed to change slide."
            });
        }
    }, [currentHostAlertState, dbSession, gameStructure?.slides.length, sessionManager]);

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
        setAllTeamsAlertDismissed: setAllTeamsAlertDismissed,

        // Team interaction
        setAllTeamsSubmittedCurrentInteractivePhase: setAllTeamsSubmittedCurrentInteractivePhase,
        allTeamsSubmittedCurrentInteractivePhase: allTeamsSubmittedState,
    };
};
