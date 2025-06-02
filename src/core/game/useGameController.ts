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
    dbSession: GameSession | null,
    gameStructure: GameStructure | null,
    // updateSessionInDb: (updates: Partial<Pick<GameSession, 'current_phase_id' | 'current_slide_id_in_phase' | 'is_playing' | 'teacher_notes' | 'is_complete'>>) => Promise<void>,
    // Removed direct updateSessionInDb, PhaseManager will handle it via GameSessionManager
    processChoicePhaseDecisionsFunction: (phaseId: string, associatedSlide: Slide | null) => Promise<void>
): GameControllerOutput => {
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

    // Handle initial alert or slide changes
    useEffect(() => {
        const isNewActualSlide = currentSlideData?.id !== previousSlideIdRef.current;

        if (currentSlideData) {
            slideLoadTimestamp.current = Date.now();
            console.log(`[useGameController] Processing slide ${currentSlideData.id}, isNew: ${isNewActualSlide}, type: ${currentSlideData.type}`);

            if (isNewActualSlide && currentHostAlertState) {
                // Clear any existing alert when slide changes, unless it's the specific all-submitted alert
                if (currentHostAlertState.title !== ALL_SUBMIT_ALERT_TITLE) {
                    setCurrentHostAlertState(null);
                }
            }
        }
        previousSlideIdRef.current = currentSlideData?.id;
    }, [currentSlideData, currentHostAlertState]);


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


    // Navigation actions (now using PhaseManager)
    const nextSlide = useCallback(async () => {
        if (!dbSession?.id || !currentPhaseNode || dbSession.current_slide_id_in_phase === null || !phaseManager) {
            console.warn("[useGameController] Cannot advance: Missing session ID, current phase, slide index, or PhaseManager.");
            return;
        }

        if (currentHostAlertState && currentHostAlertState.title === currentSlideData?.host_alert?.title && currentHostAlertState.message === currentSlideData?.host_alert?.message) {
            // If the current slide has a blocking host alert, activate it and don't advance yet.
            // The clearHostAlert function will handle the actual advancement.
            setCurrentHostAlertState(currentSlideData.host_alert);
            return;
        }

        // Before advancing, if it's the last slide of a choice phase, process decisions.
        const isLastSlideOfChoicePhase = currentPhaseNode.phase_type === 'choice' &&
            dbSession.current_slide_id_in_phase === currentPhaseNode.slide_ids.length - 1;

        if (isLastSlideOfChoicePhase) {
            await processChoicePhaseDecisionsFunction(currentPhaseNode.id, currentSlideData);
        }

        // Now, advance the slide using PhaseManager
        try {
            await phaseManager.nextSlide(
                dbSession.id,
                dbSession.current_phase_id,
                dbSession.current_slide_id_in_phase
            );
            // After successful navigation, clear the all teams submitted alert if it was active
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
            setCurrentHostAlertState(null); // Clear any general host alerts
        } catch (error) {
            console.error("[useGameController] Error advancing slide:", error);
            setCurrentHostAlertState({
                title: "Navigation Error",
                message: error instanceof Error ? error.message : "Failed to advance slide."
            });
        }
    }, [dbSession, currentPhaseNode, currentSlideData, phaseManager, processChoicePhaseDecisionsFunction, currentHostAlertState]);


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
            await phaseManager.previousSlide(
                dbSession.id,
                dbSession.current_phase_id,
                dbSession.current_slide_id_in_phase
            );
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
            await phaseManager.selectPhase(dbSession.id, phaseId);
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
                await sessionManager.updateTeacherNotes(dbSession.id, newTeacherNotes);
            } catch (error) {
                console.error("[useGameController] Error updating teacher notes:", error);
            }
        }
    }, [currentSlideData, dbSession, hostNotesState]);

    // Host alert management
    const clearHostAlert = useCallback(async () => {
        // If the alert is the one tied to current slide's host_alert,
        // clearing it means we should then advance the slide.
        if (currentHostAlertState?.title === currentSlideData?.host_alert?.title &&
            currentHostAlertState?.message === currentSlideData?.host_alert?.message) {
            setCurrentHostAlertState(null);
            await nextSlide(); // Advance only if this specific alert caused it
        } else if (currentHostAlertState?.title === ALL_SUBMIT_ALERT_TITLE) {
            // If it's the "all teams submitted" alert, clearing means we're ready to advance.
            setCurrentHostAlertState(null);
            await nextSlide();
        } else {
            // For other alerts (e.g., navigation errors, manual alerts), just dismiss.
            setCurrentHostAlertState(null);
        }
    }, [currentHostAlertState, currentSlideData, nextSlide, ALL_SUBMIT_ALERT_TITLE]);

    const setCurrentHostAlertStateManually = useCallback((alert: { title: string; message: string } | null) => {
        setCurrentHostAlertState(alert);
    }, []);

    return {
        currentPhaseId: dbSession?.current_phase_id || null, // Directly from dbSession
        currentSlideIdInPhase: dbSession?.current_slide_id_in_phase || null, // Directly from dbSession
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
        setCurrentHostAlertState: setCurrentHostAlertStateManually // Provide a setter for other components to trigger alerts
    };
};
