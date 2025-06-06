// src/core/game/useGameController.ts - Game navigation & slide management
import {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {GameSession, GameStructure, GamePhaseNode, Slide} from '@shared/types';
import {PhaseManager} from './PhaseManager';
import {GameSessionManager} from './GameSessionManager';

export interface GameControllerOutput {
    currentPhaseId: string | null;
    currentSlideIdInPhase: number | null;
    currentPhaseNode: GamePhaseNode | null;
    currentSlideData: Slide | null;
    teacherNotes: Record<string, string>;
    currentHostAlert: { title: string; message: string } | null;
    allPhasesInOrder: GamePhaseNode[];
    allTeamsSubmittedCurrentInteractivePhase: boolean;
    setAllTeamsSubmittedCurrentInteractivePhase: (submitted: boolean) => void;
    selectPhase: (phaseId: string) => Promise<void>;
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>;
    updateHostNotesForCurrentSlide: (notes: string) => void;
    clearHostAlert: () => Promise<void>;
    setCurrentHostAlertState: (alert: { title: string; message: string } | null) => void;
}

/**
 * useGameController is a React hook that manages the active game session's
 * current phase, slide, and host-specific UI states like notes and alerts.
 * It orchestrates navigation by interacting with the PhaseManager.
 */
export const useGameController = (
    initialDbSession: GameSession | null,
    gameStructure: GameStructure | null,
    processChoicePhaseDecisionsFunction: (phaseId: string, associatedSlide: Slide | null) => Promise<void>
): GameControllerOutput => {
    const [dbSession, setDbSession] = useState<GameSession | null>(initialDbSession);

    // UI-specific states that remain in the hook
    const [hostNotesState, setHostNotesState] = useState<Record<string, string>>({});
    const [currentHostAlertState, setCurrentHostAlertState] = useState<{
        title: string;
        message: string
    } | null>(null);
    const [allTeamsSubmittedCurrentInteractivePhaseState, setAllTeamsSubmittedCurrentInteractivePhaseState] = useState<boolean>(false);

    const slideLoadTimestamp = useRef(0);
    const previousSlideIdRef = useRef<number | undefined>(undefined);

    const ALL_SUBMIT_ALERT_TITLE = "All Teams Have Submitted";
    const ALL_SUBMIT_ALERT_MESSAGE = "Please verify all teams are happy with their submission. Then click Next to proceed.";

    // Update internal session state when prop changes
    useEffect(() => {
        console.log("[useGameController] External session updated:", initialDbSession?.id,
            "Current phase:", initialDbSession?.current_phase_id,
            "Current slide:", initialDbSession?.current_slide_id_in_phase);
        setDbSession(initialDbSession);
    }, [initialDbSession]);

    // Instantiate PhaseManager using a memoized value or ref
    const phaseManager = useMemo(() => {
        if (!gameStructure) return null; // PhaseManager needs gameStructure
        const sessionManager = GameSessionManager.getInstance();
        return new PhaseManager(gameStructure, sessionManager);
    }, [gameStructure]);

    // Derived states from dbSession and PhaseManager
    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        return phaseManager?.getAllPhasesInOrder() || [];
    }, [phaseManager]);

    const currentPhaseNode = useMemo(() => {
        if (!dbSession?.current_phase_id || !phaseManager) return null;
        return phaseManager.getPhaseById(dbSession.current_phase_id) || null;
    }, [dbSession?.current_phase_id, phaseManager]);

    const currentSlideData = useMemo(() => {
        if (!currentPhaseNode || dbSession?.current_slide_id_in_phase === null || !phaseManager) return null;
        const slideId = currentPhaseNode.slide_ids[dbSession.current_slide_id_in_phase];
        return phaseManager.getSlideById(slideId) || null;
    }, [currentPhaseNode, dbSession?.current_slide_id_in_phase, phaseManager]);

    // Initialize host notes from dbSession
    useEffect(() => {
        if (dbSession) {
            setHostNotesState(dbSession.teacher_notes || {});
        } else {
            // Reset for new/unloaded sessions
            setHostNotesState({});
            setCurrentHostAlertState(null);
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
        }
    }, [dbSession]);

    // Handle slide changes - clear non-persistent alerts
    useEffect(() => {
        const isNewActualSlide = currentSlideData?.id !== previousSlideIdRef.current;

        if (currentSlideData && isNewActualSlide) {
            slideLoadTimestamp.current = Date.now();
            console.log(`[useGameController] Processing slide ${currentSlideData.id}, isNew: ${isNewActualSlide}, type: ${currentSlideData.type}`);

            if (currentHostAlertState) {
                // Clear any existing alert when slide changes, unless it's the specific all-submitted alert
                if (currentHostAlertState.title !== ALL_SUBMIT_ALERT_TITLE) {
                    console.log('[useGameController] Clearing non-persistent alert due to slide change');
                    setCurrentHostAlertState(null);
                }
            }
        }
        previousSlideIdRef.current = currentSlideData?.id;
    }, [currentSlideData, currentHostAlertState, ALL_SUBMIT_ALERT_TITLE]);

    // Effect to show "All Teams Submitted" alert
    useEffect(() => {
        if (allTeamsSubmittedCurrentInteractivePhaseState) {
            setCurrentHostAlertState({title: ALL_SUBMIT_ALERT_TITLE, message: ALL_SUBMIT_ALERT_MESSAGE});
        } else {
            // If teams are no longer all submitted, and this alert is showing, clear it.
            // This might happen if decisions are reset.
            if (currentHostAlertState?.title === ALL_SUBMIT_ALERT_TITLE) {
                setCurrentHostAlertState(null);
            }
        }
    }, [allTeamsSubmittedCurrentInteractivePhaseState, currentHostAlertState, ALL_SUBMIT_ALERT_TITLE, ALL_SUBMIT_ALERT_MESSAGE]);

    // Navigation actions (cleaned up host alert logic)
    const nextSlide = useCallback(async () => {
        if (!dbSession?.id || !currentPhaseNode || dbSession.current_slide_id_in_phase === null || !phaseManager) {
            console.warn("[useGameController] Cannot advance: Missing session ID, current phase, slide index, or PhaseManager.");
            return;
        }

        // Check if we're advancing from the last slide of a payoff phase
        const isLastSlideOfPayoffPhase = currentPhaseNode.phase_type === 'payoff' &&
            dbSession.current_slide_id_in_phase === currentPhaseNode.slide_ids.length - 1;

        // Process payoffs before advancing if needed
        if (isLastSlideOfPayoffPhase) {
            try {
                const roundNumber = currentPhaseNode.round_number as 1 | 2 | 3;
                console.log(`[useGameController] Auto-processing payoffs for round ${roundNumber}`);
                await processChoicePhaseDecisionsFunction('payoff-processing', currentSlideData);
                // Note: You'll need to create a separate payoff processing function or modify the existing one
            } catch (error) {
                console.error("[useGameController] Error processing payoffs:", error);
                setCurrentHostAlertState({
                    title: "Processing Error",
                    message: error instanceof Error ? error.message : "Failed to process payoffs."
                });
                return; // Don't advance if processing failed
            }
        }

        // Now, advance the slide using PhaseManager
        try {
            console.log("[useGameController] Calling phaseManager.nextSlide");
            const updatedSession = await phaseManager.nextSlide(
                dbSession.id,
                dbSession.current_phase_id,
                dbSession.current_slide_id_in_phase
            );
            console.log("[useGameController] PhaseManager returned updated session:", updatedSession);
            setDbSession(updatedSession);
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
            // Note: Don't auto-clear host alerts here - let them be managed by HostApp and alert handlers
        } catch (error) {
            console.error("[useGameController] Error advancing slide:", error);
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: error instanceof Error ? error.message : "Failed to advance slide."
            });
        }
    }, [dbSession, currentPhaseNode, currentSlideData, phaseManager, processChoicePhaseDecisionsFunction]);

    const previousSlide = useCallback(async () => {
        if (!dbSession?.id || !phaseManager) {
            console.warn("[useGameController] Cannot go back: Missing session ID or PhaseManager.");
            return;
        }
        if (currentHostAlertState) {
            // If an alert is showing, clicking back should just clear the alert, not navigate.
            setCurrentHostAlertState(null);
            return;
        }
        try {
            console.log("[useGameController] Calling phaseManager.previousSlide");
            const updatedSession = await phaseManager.previousSlide(
                dbSession.id,
                dbSession.current_phase_id,
                dbSession.current_slide_id_in_phase
            );
            console.log("[useGameController] PhaseManager returned updated session:", updatedSession);
            setDbSession(updatedSession);
            setAllTeamsSubmittedCurrentInteractivePhaseState(false); // Reset this if we go back
            setCurrentHostAlertState(null); // Clear any general host alerts
        } catch (error) {
            console.error("[useGameController] Error going back a slide:", error);
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: error instanceof Error ? error.message : "Failed to go back a slide."
            });
        }
    }, [dbSession, phaseManager, currentHostAlertState]);

    const selectPhase = useCallback(async (phaseId: string) => {
        if (!dbSession?.id || !phaseManager) {
            console.warn("[useGameController] Cannot select phase: Missing session ID or PhaseManager.");
            return;
        }
        try {
            console.log("[useGameController] Calling phaseManager.selectPhase");
            const updatedSession = await phaseManager.selectPhase(dbSession.id, phaseId);
            console.log("[useGameController] PhaseManager returned updated session:", updatedSession);
            setDbSession(updatedSession);
            setAllTeamsSubmittedCurrentInteractivePhaseState(false); // Reset if jumping
            setCurrentHostAlertState(null); // Clear any general host alerts
        } catch (error) {
            console.error("[useGameController] Error selecting phase:", error);
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: error instanceof Error ? error.message : "Failed to select phase."
            });
        }
    }, [dbSession, phaseManager]);

    // Host notes management
    const updateHostNotesForCurrentSlide = useCallback(async (notes: string) => {
        if (currentSlideData && dbSession?.id) {
            const slideKey = String(currentSlideData.id);
            const newTeacherNotes = {...hostNotesState, [slideKey]: notes};
            setHostNotesState(newTeacherNotes);
            // Directly update via GameSessionManager
            const sessionManager = GameSessionManager.getInstance();
            try {
                const updatedSession = await sessionManager.updateTeacherNotes(dbSession.id, newTeacherNotes);
                setDbSession(updatedSession);
            } catch (error) {
                console.error("[useGameController] Error updating teacher notes:", error);
            }
        }
    }, [currentSlideData, dbSession, hostNotesState]);

    // Host alert management
    const clearHostAlert = useCallback(async () => {
        if (!currentHostAlertState) return;

        // If it's the "all teams submitted" alert, clearing means we're ready to advance.
        if (currentHostAlertState.title === ALL_SUBMIT_ALERT_TITLE) {
            setCurrentHostAlertState(null);
            await nextSlide();
        } else {
            // For other alerts (including slide host alerts), clearing should advance the slide
            setCurrentHostAlertState(null);
            await nextSlide();
        }
    }, [currentHostAlertState, nextSlide, ALL_SUBMIT_ALERT_TITLE]);

    const setCurrentHostAlertStateManually = useCallback((alert: { title: string; message: string } | null) => {
        console.log('[useGameController] Setting host alert manually:', alert?.title);
        setCurrentHostAlertState(alert);
    }, []);

    return {
        currentPhaseId: dbSession?.current_phase_id || null, // Now from internal state
        currentSlideIdInPhase: dbSession?.current_slide_id_in_phase || null, // Now from internal state
        currentPhaseNode,
        currentSlideData,
        teacherNotes: hostNotesState,
        currentHostAlert: currentHostAlertState,
        allPhasesInOrder,
        allTeamsSubmittedCurrentInteractivePhase: allTeamsSubmittedCurrentInteractivePhaseState,
        setAllTeamsSubmittedCurrentInteractivePhase: setAllTeamsSubmittedCurrentInteractivePhaseState,
        selectPhase,
        nextSlide,
        previousSlide,
        updateHostNotesForCurrentSlide,
        clearHostAlert,
        setCurrentHostAlertState: setCurrentHostAlertStateManually
    };
};
