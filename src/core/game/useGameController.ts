// src/hooks/useGameController.ts - Game navigation & slide management
import {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {GameStructure, GamePhaseNode, Slide} from '@shared/types/game';
import {GameSession} from '@shared/types/database';

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

export const useGameController = (
    dbSession: GameSession | null,
    gameStructure: GameStructure | null,
    updateSessionInDb: (updates: Partial<Pick<GameSession, 'current_phase_id' | 'current_slide_id_in_phase' | 'is_playing' | 'teacher_notes' | 'is_complete'>>) => Promise<void>,
    processChoicePhaseDecisionsFunction: (phaseId: string, associatedSlide: Slide | null) => Promise<void>
): GameControllerOutput => {
    const [currentPhaseIdState, setCurrentPhaseIdState] = useState<string | null>(null);
    const [currentSlideIdInPhaseState, setCurrentSlideIdInPhaseState] = useState<number | null>(0);
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

    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        if (!gameStructure?.allPhases) return [];
        return gameStructure.allPhases;
    }, [gameStructure]);

    const currentPhaseNode = useMemo(() => {
        if (!currentPhaseIdState) return null;
        return allPhasesInOrder.find(p => p.id === currentPhaseIdState) || null;
    }, [allPhasesInOrder, currentPhaseIdState]);

    const currentSlideData = useMemo(() => {
        if (!currentPhaseNode || currentSlideIdInPhaseState === null || !gameStructure?.slides) return null;
        if (currentPhaseNode.slide_ids.length === 0) return null;
        if (currentSlideIdInPhaseState < 0 || currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length) {
            return null;
        }
        const slideId = currentPhaseNode.slide_ids[currentSlideIdInPhaseState];
        return gameStructure.slides.find(s => s.id === slideId) || null;
    }, [currentPhaseNode, currentSlideIdInPhaseState, gameStructure?.slides]);

    useEffect(() => {
        if (dbSession) {
            setCurrentPhaseIdState(dbSession.current_phase_id);
            setCurrentSlideIdInPhaseState(dbSession.current_slide_id_in_phase ?? 0);
            setHostNotesState(dbSession.teacher_notes || {});
        } else {
            const firstPhaseId = gameStructure?.welcome_phases?.[0]?.id || allPhasesInOrder[0]?.id || null;
            setCurrentPhaseIdState(firstPhaseId);
            setCurrentSlideIdInPhaseState(0);
            setHostNotesState({});
            setCurrentHostAlertState(null);
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
        }
    }, [dbSession, gameStructure, allPhasesInOrder]);

    useEffect(() => {
        const isNewActualSlide = currentSlideData?.id !== previousSlideIdRef.current;

        if (currentSlideData) {
            slideLoadTimestamp.current = Date.now();
            console.log(`[GameController] Processing slide ${currentSlideData.id}, isNew: ${isNewActualSlide}, type: ${currentSlideData.type}`);

            if (isNewActualSlide && currentHostAlertState) {
                setCurrentHostAlertState(null);
            }
        }
        previousSlideIdRef.current = currentSlideData?.id;
    }, [currentSlideData, currentHostAlertState]);

    const advanceToNextSlideInternal = useCallback(async () => {
        if (!currentPhaseNode || currentSlideIdInPhaseState === null || !dbSession || !gameStructure || !allPhasesInOrder.length) return;

        const isLastSlideInPhase = currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length - 1;
        let nextPhaseId = currentPhaseIdState;
        let nextSlideIndexInPhase = currentSlideIdInPhaseState + 1;

        if (isLastSlideInPhase) {
            if (currentPhaseNode.is_interactive_player_phase && currentPhaseNode.phase_type === 'choice') {
                await processChoicePhaseDecisionsFunction(currentPhaseNode.id, currentSlideData);
            }

            const currentOverallPhaseIndex = allPhasesInOrder.findIndex(p => p.id === currentPhaseIdState);
            if (currentOverallPhaseIndex < allPhasesInOrder.length - 1) {
                const nextPhaseNodeCandidate = allPhasesInOrder[currentOverallPhaseIndex + 1];
                nextPhaseId = nextPhaseNodeCandidate.id;
                nextSlideIndexInPhase = 0;
            } else {
                await updateSessionInDb({is_complete: true});
                return;
            }
        }

        await updateSessionInDb({
            current_phase_id: nextPhaseId,
            current_slide_id_in_phase: nextSlideIndexInPhase,
        });

        setCurrentPhaseIdState(nextPhaseId);
        setCurrentSlideIdInPhaseState(nextSlideIndexInPhase);

    }, [currentPhaseNode, currentSlideIdInPhaseState, dbSession, gameStructure, allPhasesInOrder, updateSessionInDb, processChoicePhaseDecisionsFunction, currentPhaseIdState, currentSlideData]);

    useEffect(() => {
        if (allTeamsSubmittedCurrentInteractivePhaseState) {
            setCurrentHostAlertState({title: ALL_SUBMIT_ALERT_TITLE, message: ALL_SUBMIT_ALERT_MESSAGE});
        }
    }, [allTeamsSubmittedCurrentInteractivePhaseState, currentSlideData, setCurrentHostAlertState, ALL_SUBMIT_ALERT_TITLE, ALL_SUBMIT_ALERT_MESSAGE]);

    const nextSlide = useCallback(async () => {
        if (currentHostAlertState) {
            return;
        }

        if (currentSlideData?.host_alert) {
            setCurrentHostAlertState(currentSlideData.host_alert);
            return;
        }

        await advanceToNextSlideInternal();
    }, [currentHostAlertState, currentSlideData, advanceToNextSlideInternal, setCurrentHostAlertState]);

    const clearHostAlert = useCallback(async () => {
        setCurrentHostAlertState(null);
        await advanceToNextSlideInternal();
    }, [advanceToNextSlideInternal]);

    const selectPhase = useCallback(async (phaseId: string) => {
        const targetPhase = allPhasesInOrder.find(p => p.id === phaseId);
        if (targetPhase && dbSession && gameStructure?.slides) {
            await updateSessionInDb({
                current_phase_id: phaseId,
                current_slide_id_in_phase: 0,
                teacher_notes: hostNotesState
            });
            if (currentHostAlertState) setCurrentHostAlertState(null);
            setCurrentPhaseIdState(phaseId);
            setCurrentSlideIdInPhaseState(0);
        }
    }, [allPhasesInOrder, dbSession, updateSessionInDb, hostNotesState, gameStructure?.slides, currentHostAlertState]);

    const previousSlide = useCallback(async () => {
        if (currentHostAlertState) return;

        if (currentPhaseNode && currentSlideIdInPhaseState !== null && dbSession && gameStructure?.slides) {
            let newPhaseId = currentPhaseIdState;
            let newSlideIndex = currentSlideIdInPhaseState;

            if (currentSlideIdInPhaseState > 0) {
                newSlideIndex = currentSlideIdInPhaseState - 1;
            } else {
                const currentPhaseIndex = allPhasesInOrder.findIndex(p => p.id === currentPhaseIdState);
                if (currentPhaseIndex > 0) {
                    const prevPhaseNode = allPhasesInOrder[currentPhaseIndex - 1];
                    newPhaseId = prevPhaseNode.id;
                    newSlideIndex = prevPhaseNode.slide_ids.length - 1;
                } else {
                    return;
                }
            }
            await updateSessionInDb({
                current_phase_id: newPhaseId,
                current_slide_id_in_phase: newSlideIndex,
            });
            if (currentHostAlertState) setCurrentHostAlertState(null);
            setCurrentPhaseIdState(newPhaseId);
            setCurrentSlideIdInPhaseState(newSlideIndex);
        }
    }, [currentHostAlertState, currentPhaseNode, currentSlideIdInPhaseState, dbSession, allPhasesInOrder, updateSessionInDb, currentPhaseIdState, gameStructure?.slides]);

    const updateTeacherNotesForCurrentSlide = useCallback(async (notes: string) => {
        if (currentSlideData && dbSession) {
            const slideKey = String(currentSlideData.id);
            const newTeacherNotes = {...hostNotesState, [slideKey]: notes};
            setHostNotesState(newTeacherNotes);
            await updateSessionInDb({teacher_notes: newTeacherNotes});
        }
    }, [currentSlideData, dbSession, hostNotesState, updateSessionInDb]);

    return {
        currentPhaseId: currentPhaseIdState,
        currentSlideIdInPhase: currentSlideIdInPhaseState,
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
        updateHostNotesForCurrentSlide: updateTeacherNotesForCurrentSlide,
        clearHostAlert: clearHostAlert,
        setCurrentHostAlertState: setCurrentHostAlertState
    };
};