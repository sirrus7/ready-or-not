// src/core/game/useGameController.ts
// UPDATED: Adds payoff slide processing alongside consequence processing

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {GameSessionManager} from '@core/game/GameSessionManager';
import {GameStructure, GameSession, Slide} from '@shared/types';
import {useSlidePreCaching} from '@shared/hooks/useSlidePreCaching';

export const useGameController = (
    initialDbSession: GameSession | null,
    gameStructure: GameStructure | null,
    gameVersion: string | undefined,
    processInteractiveSlide: (completedSlide: Slide) => Promise<void>,
    processConsequenceSlide: (consequenceSlide: Slide) => Promise<void>,
    processPayoffSlide: (payoffSlide: Slide) => Promise<void>,
    processKpiResetSlide: (kpiResetSlide: Slide) => Promise<void>
) => {
    // STATE MANAGEMENT
    const [dbSession, setDbSession] = useState<GameSession | null>(initialDbSession);
    const [hostNotesState, setHostNotesState] = useState<Record<number, string>>({});
    const [currentHostAlertState, setCurrentHostAlertState] = useState<{ title: string; message: string } | null>(null);
    const [allTeamsSubmittedState, setAllTeamsSubmittedCurrentInteractivePhase] = useState<boolean>(false);

    // CRITICAL FIX: Track the last processed slide to prevent re-processing on data refresh
    const lastProcessedSlideRef = useRef<number | null>(null);
    const processingRef = useRef<boolean>(false);

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
        gameVersion,
        {
            precacheCount: 3,
            enabled: true
        }
    );

    // INITIALIZE HOST NOTES
    useEffect(() => {
        if (dbSession?.host_notes) {
            setHostNotesState(dbSession.host_notes);
        }
    }, [dbSession?.host_notes]);

    // ULTIMATE FIX: Process effect slides (consequences and payoffs) when slide ID actually changes
    useEffect(() => {
        if (!currentSlideData || !gameStructure || !dbSession?.id) return;

        const processEffectSlideAuto = async () => {
            // Handle consequence slides
            if (currentSlideData.type === 'consequence_reveal') {
                // ULTIMATE FIX: Only process if this is a new slide and we're not already processing
                if (lastProcessedSlideRef.current === currentSlideData.id || processingRef.current) return;

                try {
                    // Mark as processing to prevent concurrent calls
                    processingRef.current = true;
                    await processConsequenceSlide(currentSlideData);
                    // Mark as processed AFTER successful completion
                    lastProcessedSlideRef.current = currentSlideData.id;
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
            }

            // Handle payoff slides (NEW)
            if (currentSlideData.type === 'payoff_reveal') {
                // Same duplicate prevention logic as consequences
                if (lastProcessedSlideRef.current === currentSlideData.id || processingRef.current) return;

                try {
                    // Mark as processing to prevent concurrent calls
                    processingRef.current = true;
                    await processPayoffSlide(currentSlideData);
                    // Mark as processed AFTER successful completion
                    lastProcessedSlideRef.current = currentSlideData.id;
                } catch (error) {
                    console.error(`[useGameController] ❌ Error processing payoff slide:`, error);
                    // Don't mark as processed on error so it can be retried
                    setCurrentHostAlertState({
                        title: "Processing Error",
                        message: `Failed to process payoff slide: ${error instanceof Error ? error.message : "Unknown error"}`
                    });
                } finally {
                    // Always reset processing flag
                    processingRef.current = false;
                }
            }

            // Handle KPI reset slides (NEW - minimal addition)
            if (currentSlideData.type === 'kpi_reset') {
                if (lastProcessedSlideRef.current === currentSlideData.id || processingRef.current) return;

                try {
                    processingRef.current = true;
                    await processKpiResetSlide(currentSlideData);
                    lastProcessedSlideRef.current = currentSlideData.id;
                } catch (error) {
                    console.error(`[useGameController] ❌ Error processing KPI reset slide:`, error);
                    setCurrentHostAlertState({
                        title: "Processing Error",
                        message: `Failed to process KPI reset slide: ${error instanceof Error ? error.message : "Unknown error"}`
                    });
                } finally {
                    processingRef.current = false;
                }
            }

            // Reset last processed slide when we leave effect slides
            if (lastProcessedSlideRef.current !== null &&
                currentSlideData.type !== 'consequence_reveal' &&
                currentSlideData.type !== 'payoff_reveal') {
                lastProcessedSlideRef.current = null;
            }
        };

        processEffectSlideAuto();
    }, [currentSlideData, gameStructure, dbSession?.id, processConsequenceSlide, processPayoffSlide]);

    useEffect(() => {
        const autoCompleteGame = async () => {
            // Only proceed if we have the necessary data and haven't already completed
            if (!currentSlideData || !dbSession || dbSession.is_complete) return;

            // Check if we've reached slide 197 (final slide)
            if (currentSlideData.id === 197) {
                try {
                    // Mark the session as completed in the database
                    const completedSession = await sessionManager.completeSession(dbSession.id);
                    // Update local state to reflect completion
                    setDbSession(completedSession);
                } catch (error) {
                    console.error('[useGameController] ❌ Error completing game session:', error);
                }
            }
        };

        autoCompleteGame();
    }, [currentSlideData, dbSession, sessionManager, setCurrentHostAlertState]);

    // HOST ALERT MANAGEMENT
    const clearHostAlert = useCallback(async () => {
        if (!currentHostAlertState || !dbSession) return;

        setCurrentHostAlertState(null);

        // Always advance slide when clearHostAlert is called
        try {
            const nextSlideIndex = Math.min(
                (dbSession.current_slide_index ?? 0) + 1,
                (gameStructure?.slides.length ?? 1) - 1
            );
            await sessionManager.updateSession(dbSession.id, {current_slide_index: nextSlideIndex});
            setDbSession(prev => prev ? {...prev, current_slide_index: nextSlideIndex} : null);
        } catch (error) {
            if (import.meta.env.DEV) console.warn(error);
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: "Failed to change slide."
            });
        }
    }, [currentHostAlertState, dbSession, gameStructure?.slides.length, sessionManager]);

    // SLIDE NAVIGATION METHODS
    const nextSlide = useCallback(async (source: 'manual' | 'video' | 'auto' = 'manual') => {
        if (currentSlideIndex === null || !currentSlideData) {
            console.warn('[useGameController] Cannot advance: No current slide');
            return;
        }

        // Process interactive slides on completion
        if (currentSlideData.interactive_data_key && currentSlideData.type.startsWith('interactive_')) {
            try {
                await processInteractiveSlide(currentSlideData);

                // Add small delay if this was a choice slide to let auto-submissions settle
                if (currentSlideData.type === 'interactive_choice') {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // Show slide-specific host alert if configured and not manually advanced
                if (currentSlideData.host_alert && source !== 'manual') {
                    console.log('[useGameController] Showing slide-specific host alert:', currentSlideData.host_alert);
                    setCurrentHostAlertState(currentSlideData.host_alert);
                }
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

        try {
            const prevIndex = Math.max(currentSlideIndex - 1, 0);
            await sessionManager.updateSession(dbSession.id, {current_slide_index: prevIndex});
            setDbSession(prev => prev ? {...prev, current_slide_index: prevIndex} : null);
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

        try {
            await sessionManager.updateSession(dbSession.id, {current_slide_index: targetIndex});
            setDbSession(prev => prev ? {...prev, current_slide_index: targetIndex} : null);
        } catch (error) {
            console.error('[useGameController] Error jumping to slide:', error);
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: error instanceof Error ? error.message : "Failed to jump to slide."
            });
        }
    }, [dbSession, gameStructure?.slides.length, sessionManager]);

    // Move these callback definitions BEFORE the return (give them new names to avoid conflicts)
    const updateHostNotesForCurrentSlide = useCallback(async (notes: string) => {
        if (currentSlideIndex === null || !dbSession) return;
        const updatedHostNotes = {...hostNotesState, [currentSlideIndex]: notes};
        setHostNotesState(updatedHostNotes);
        try {
            await sessionManager.updateSession(dbSession.id, {host_notes: updatedHostNotes});
            setDbSession(prev => prev ? {...prev, host_notes: updatedHostNotes} : null);
        } catch (error) {
            console.error('[useGameController] Error saving host notes:', error);
        }
    }, [currentSlideIndex, dbSession, hostNotesState, sessionManager]);

    const updateAllTeamsSubmittedCurrentInteractivePhase = useCallback((submitted: boolean) => {
        setAllTeamsSubmittedCurrentInteractivePhase(submitted);
    }, []);

    const updateCurrentHostAlertState = useCallback((alert: { title: string; message: string } | null) => {
        console.log('[useGameController] setCurrentHostAlertState called with:', alert);
        setCurrentHostAlertState(alert);
    }, []);

    // RETURN VALUES (keeping existing return structure but memoized)
    return useMemo(() => ({
        // Session state
        dbSession,
        currentSlideIndex,
        currentSlideData,

        // Host state
        hostNotes: hostNotesState[currentSlideIndex ?? -1] || '',
        currentHostAlert: currentHostAlertState,
        allTeamsSubmitted: allTeamsSubmittedState,

        // Navigation methods
        nextSlide,
        previousSlide,
        selectSlideByIndex,

        // State management methods (keeping original API names)
        updateHostNotesForCurrentSlide,
        setAllTeamsSubmittedCurrentInteractivePhase: updateAllTeamsSubmittedCurrentInteractivePhase,
        setCurrentHostAlertState: updateCurrentHostAlertState,
        clearHostAlert,
    }), [
        dbSession,
        currentSlideIndex,
        currentSlideData,
        hostNotesState,
        currentHostAlertState,
        allTeamsSubmittedState,
        nextSlide,
        previousSlide,
        selectSlideByIndex,
        updateHostNotesForCurrentSlide,
        updateAllTeamsSubmittedCurrentInteractivePhase,
        updateCurrentHostAlertState,
        clearHostAlert,
    ]);
};
