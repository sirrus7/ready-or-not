import {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {GameSession, GameStructure, GamePhaseNode, Slide} from '../types';

export interface GameControllerOutput {
    currentPhaseId: string | null;
    currentSlideIdInPhase: number | null;
    currentPhaseNode: GamePhaseNode | null;
    currentSlideData: Slide | null;
    teacherNotes: Record<string, string>;
    isPlayingVideo: boolean;
    videoCurrentTime: number;
    triggerVideoSeek: boolean;
    currentTeacherAlert: { title: string; message: string } | null;
    allPhasesInOrder: GamePhaseNode[];
    allTeamsSubmittedCurrentInteractivePhase: boolean;
    setAllTeamsSubmittedCurrentInteractivePhase: (submitted: boolean) => void;
    selectPhase: (phaseId: string) => Promise<void>;
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>;
    updateTeacherNotesForCurrentSlide: (notes: string) => void;
    clearTeacherAlert: () => Promise<void>;
    currentVideoDuration: number | null;
    setCurrentTeacherAlertState: (alert: { title: string; message: string } | null) => void;
    broadcastVideoState: (playing: boolean, time: number) => void;
    onStateChange?: (state: {
        isPlayingVideo: boolean;
        videoCurrentTime: number;
        triggerVideoSeek: boolean;
        currentSlideData: Slide | null;
        currentPhaseNode: GamePhaseNode | null;
        currentTeacherAlert?: { title: string; message: string } | null;
    }) => void;
}

export const useGameController = (
    dbSession: GameSession | null,
    gameStructure: GameStructure | null,
    updateSessionInDb: (updates: Partial<Pick<GameSession, 'current_phase_id' | 'current_slide_id_in_phase' | 'is_playing' | 'teacher_notes' | 'is_complete'>>) => Promise<void>,
    processChoicePhaseDecisionsFunction: (phaseId: string, associatedSlide: Slide | null) => Promise<void>,
    onStateChange?: (state: {
        isPlayingVideo: boolean;
        videoCurrentTime: number;
        triggerVideoSeek: boolean;
        currentSlideData: Slide | null;
        currentPhaseNode: GamePhaseNode | null;
    }) => void
): GameControllerOutput => {
    const [currentPhaseIdState, setCurrentPhaseIdState] = useState<string | null>(null);
    const [currentSlideIdInPhaseState, setCurrentSlideIdInPhaseState] = useState<number | null>(0);
    const [teacherNotesState, setTeacherNotesState] = useState<Record<string, string>>({});
    const [isPlayingVideoState, setIsPlayingVideoState] = useState<boolean>(false);
    const [videoCurrentTimeState, setVideoCurrentTimeState] = useState<number>(0);
    const [triggerVideoSeekState, setTriggerVideoSeekState] = useState<boolean>(false);
    const [currentTeacherAlertState, setCurrentTeacherAlertState] = useState<{title: string; message: string} | null>(null);
    const [currentVideoDurationState, setCurrentVideoDurationState] = useState<number | null>(null);
    const [allTeamsSubmittedCurrentInteractivePhaseState, setAllTeamsSubmittedCurrentInteractivePhaseState] = useState<boolean>(false);

    const slideLoadTimestamp = useRef(0);
    const internalSeekFlag = useRef(false);
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

    // Function to trigger immediate broadcast when state changes
    const triggerStateSync = useCallback(() => {
        if (onStateChange) {
            onStateChange({
                isPlayingVideo: isPlayingVideoState,
                videoCurrentTime: videoCurrentTimeState,
                triggerVideoSeek: triggerVideoSeekState,
                currentSlideData,
                currentPhaseNode,
            });
        }
    }, [onStateChange, isPlayingVideoState, videoCurrentTimeState, triggerVideoSeekState, currentSlideData, currentPhaseNode]);

    useEffect(() => {
        if (dbSession) {
            setCurrentPhaseIdState(dbSession.current_phase_id);
            setCurrentSlideIdInPhaseState(dbSession.current_slide_id_in_phase ?? 0);
            setTeacherNotesState(dbSession.teacher_notes || {});
        } else {
            const firstPhaseId = gameStructure?.welcome_phases?.[0]?.id || allPhasesInOrder[0]?.id || null;
            setCurrentPhaseIdState(firstPhaseId);
            setCurrentSlideIdInPhaseState(0);
            setTeacherNotesState({});
            setIsPlayingVideoState(false);
            setCurrentTeacherAlertState(null);
            setVideoCurrentTimeState(0);
            setTriggerVideoSeekState(false);
            setCurrentVideoDurationState(null);
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
        }
    }, [dbSession, gameStructure, allPhasesInOrder]);

    const pauseVideoIfNeeded = useCallback(async () => {
        if (isPlayingVideoState) {
            setIsPlayingVideoState(false);
            if (dbSession && dbSession.is_playing) {
                await updateSessionInDb({ is_playing: false });
            }
            // Immediate sync after state change
            setTimeout(triggerStateSync, 0);
        }
    }, [isPlayingVideoState, dbSession, updateSessionInDb, triggerStateSync]);

    useEffect(() => {
        const isNewActualSlide = currentSlideData?.id !== previousSlideIdRef.current;

        if (currentSlideData) {
            slideLoadTimestamp.current = Date.now();
            console.log(`[GameController] Processing slide ${currentSlideData.id}, isNew: ${isNewActualSlide}, type: ${currentSlideData.type}`);

            if (isNewActualSlide && currentTeacherAlertState) {
                setCurrentTeacherAlertState(null);
            }

            const isVideo = currentSlideData.type !== 'image'

            console.log(`[GameController] Slide ${currentSlideData.id} is video: ${isVideo}`);

            if (isVideo) {
                if (isNewActualSlide) {
                    setCurrentVideoDurationState(null);
                    setVideoCurrentTimeState(0);
                    internalSeekFlag.current = true;
                    setTriggerVideoSeekState(true);
                    setIsPlayingVideoState(true)

                    if (dbSession && !dbSession.is_playing) {
                        updateSessionInDb({is_playing: true});
                    }

                    requestAnimationFrame(() => {
                        setTriggerVideoSeekState(false);
                        internalSeekFlag.current = false;
                        // Sync after seek state is cleared
                        triggerStateSync();
                    });
                }
            }
        }
        previousSlideIdRef.current = currentSlideData?.id;
    }, [currentSlideData, dbSession, updateSessionInDb, pauseVideoIfNeeded, triggerStateSync, isPlayingVideoState, currentTeacherAlertState]);

    const advanceToNextSlideInternal = useCallback(async () => {
        if (!currentPhaseNode || currentSlideIdInPhaseState === null || !dbSession || !gameStructure || !allPhasesInOrder.length) return;

        const isLastSlideInPhase = currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length - 1;
        let nextPhaseId = currentPhaseIdState;
        let nextSlideIndexInPhase = currentSlideIdInPhaseState + 1;

        if (isLastSlideInPhase) {
            if (currentPhaseNode.is_interactive_student_phase && currentPhaseNode.phase_type === 'choice') {
                await processChoicePhaseDecisionsFunction(currentPhaseNode.id, currentSlideData);
            }

            const currentOverallPhaseIndex = allPhasesInOrder.findIndex(p => p.id === currentPhaseIdState);
            if (currentOverallPhaseIndex < allPhasesInOrder.length - 1) {
                const nextPhaseNodeCandidate = allPhasesInOrder[currentOverallPhaseIndex + 1];
                nextPhaseId = nextPhaseNodeCandidate.id;
                nextSlideIndexInPhase = 0;
            } else {
                await updateSessionInDb({is_complete: true, is_playing: false});
                return;
            }
        }

        await updateSessionInDb({
            current_phase_id: nextPhaseId,
            current_slide_id_in_phase: nextSlideIndexInPhase,
        });

        setCurrentPhaseIdState(nextPhaseId);
        setCurrentSlideIdInPhaseState(nextSlideIndexInPhase);

        // Immediate sync after slide advance
        setTimeout(triggerStateSync, 0);

    }, [currentPhaseNode, currentSlideIdInPhaseState, dbSession, gameStructure, allPhasesInOrder, updateSessionInDb, processChoicePhaseDecisionsFunction, currentPhaseIdState, currentSlideData, triggerStateSync]);

    useEffect(() => {
        if (allTeamsSubmittedCurrentInteractivePhaseState) {
            setCurrentTeacherAlertState({ title: ALL_SUBMIT_ALERT_TITLE, message: ALL_SUBMIT_ALERT_MESSAGE });
            pauseVideoIfNeeded();
        }
    }, [allTeamsSubmittedCurrentInteractivePhaseState, currentSlideData, setCurrentTeacherAlertState, pauseVideoIfNeeded, ALL_SUBMIT_ALERT_TITLE, ALL_SUBMIT_ALERT_MESSAGE]);

    useEffect(() => {
        console.log(`[GameController] Slide/Phase changed - Phase: ${currentPhaseNode?.id}, Slide: ${currentSlideData?.id}, Type: ${currentSlideData?.type}`);

        // Trigger state sync when slide or phase changes
        if (onStateChange && currentSlideData && currentPhaseNode) {
            console.log(`[GameController] Triggering state sync for slide change`);
            setTimeout(() => {
                onStateChange({
                    isPlayingVideo: isPlayingVideoState,
                    videoCurrentTime: videoCurrentTimeState,
                    triggerVideoSeek: false,
                    currentSlideData,
                    currentPhaseNode,
                });
            }, 100); // Small delay to ensure state is settled
        }
    }, [currentSlideData?.id, currentPhaseNode?.id, onStateChange, currentSlideData, currentPhaseNode, isPlayingVideoState, videoCurrentTimeState, currentTeacherAlertState]);

    const nextSlide = useCallback(async () => {
        if (currentTeacherAlertState) {
            return;
        }

        if (currentSlideData?.teacher_alert) {
            await pauseVideoIfNeeded();
            setCurrentTeacherAlertState(currentSlideData.teacher_alert);
            return;
        }

        await advanceToNextSlideInternal();
    }, [currentTeacherAlertState, currentSlideData, advanceToNextSlideInternal, pauseVideoIfNeeded, setCurrentTeacherAlertState]);

    const clearTeacherAlert = useCallback(async () => {
        setCurrentTeacherAlertState(null);
        await advanceToNextSlideInternal();
    }, [advanceToNextSlideInternal]);

    const selectPhase = useCallback(async (phaseId: string) => {
        const targetPhase = allPhasesInOrder.find(p => p.id === phaseId);
        if (targetPhase && dbSession && gameStructure?.slides) {
            await updateSessionInDb({
                current_phase_id: phaseId,
                current_slide_id_in_phase: 0,
                teacher_notes: teacherNotesState
            });
            if (currentTeacherAlertState) setCurrentTeacherAlertState(null);
            setCurrentPhaseIdState(phaseId);
            setCurrentSlideIdInPhaseState(0);

            // Immediate sync after phase selection
            setTimeout(triggerStateSync, 0);
        }
    }, [allPhasesInOrder, dbSession, updateSessionInDb, teacherNotesState, gameStructure?.slides, currentTeacherAlertState, triggerStateSync]);

    const previousSlide = useCallback(async () => {
        if (currentTeacherAlertState) return;

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
            if (currentTeacherAlertState) setCurrentTeacherAlertState(null);
            setCurrentPhaseIdState(newPhaseId);
            setCurrentSlideIdInPhaseState(newSlideIndex);

            // Immediate sync after previous slide
            setTimeout(triggerStateSync, 0);
        }
    }, [currentTeacherAlertState, currentPhaseNode, currentSlideIdInPhaseState, dbSession, allPhasesInOrder, updateSessionInDb, currentPhaseIdState, gameStructure?.slides, triggerStateSync]);

    const broadcastVideoState = useCallback((playing: boolean, time: number) => {
        setIsPlayingVideoState(playing);
        setVideoCurrentTimeState(time);

        if (onStateChange) {
            onStateChange({
                isPlayingVideo: playing,
                videoCurrentTime: time,
                triggerVideoSeek: false,
                currentSlideData,
                currentPhaseNode,
            });
        }

        if (dbSession && dbSession.is_playing !== playing) {
            updateSessionInDb({ is_playing: playing });
        }
    }, [dbSession, updateSessionInDb, onStateChange, currentSlideData, currentPhaseNode]);

    const updateTeacherNotesForCurrentSlide = useCallback(async (notes: string) => {
        if (currentSlideData && dbSession) {
            const slideKey = String(currentSlideData.id);
            const newTeacherNotes = {...teacherNotesState, [slideKey]: notes};
            setTeacherNotesState(newTeacherNotes);
            await updateSessionInDb({teacher_notes: newTeacherNotes});
        }
    }, [currentSlideData, dbSession, teacherNotesState, updateSessionInDb]);

    return {
        currentPhaseId: currentPhaseIdState,
        currentSlideIdInPhase: currentSlideIdInPhaseState,
        currentPhaseNode,
        currentSlideData,
        teacherNotes: teacherNotesState,
        isPlayingVideo: isPlayingVideoState,
        videoCurrentTime: videoCurrentTimeState,
        triggerVideoSeek: triggerVideoSeekState,
        currentTeacherAlert: currentTeacherAlertState,
        allPhasesInOrder,
        allTeamsSubmittedCurrentInteractivePhase: allTeamsSubmittedCurrentInteractivePhaseState,
        setAllTeamsSubmittedCurrentInteractivePhase: setAllTeamsSubmittedCurrentInteractivePhaseState,
        selectPhase,
        nextSlide,
        previousSlide,
        updateTeacherNotesForCurrentSlide,
        clearTeacherAlert,
        currentVideoDuration: currentVideoDurationState,
        setCurrentTeacherAlertState,
        onStateChange,
        broadcastVideoState
    };
};