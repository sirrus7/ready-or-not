// src/hooks/useGameController.ts
import {useState, useEffect, useCallback, useMemo} from 'react';
import {GameSession, GameStructure, GamePhaseNode, Slide} from '../types';

export interface GameControllerOutput {
    currentPhaseId: string | null;
    currentSlideIdInPhase: number | null;
    currentPhaseNode: GamePhaseNode | null;
    currentSlideData: Slide | null;
    teacherNotes: Record<string, string>; // Keyed by slideId (as string for Record)
    isPlayingVideo: boolean;
    videoCurrentTime: number;
    triggerVideoSeek: boolean; // Flag to explicitly tell student display to seek
    currentTeacherAlert: { title: string; message: string } | null;
    allPhasesInOrder: GamePhaseNode[];

    selectPhase: (phaseId: string) => void;
    nextSlide: () => Promise<void>; // Will call processChoicePhaseDecisionsFunction
    previousSlide: () => void;
    togglePlayPauseVideo: () => void;
    setVideoPlaybackState: (playing: boolean, time: number, triggerSeek?: boolean) => void;
    updateTeacherNotesForCurrentSlide: (notes: string) => void;
    clearTeacherAlert: () => void;
}

export const useGameController = (
    dbSession: GameSession | null,
    gameStructure: GameStructure | null,
    updateSessionInDb: (updates: Partial<Pick<GameSession, 'current_phase_id' | 'current_slide_id_in_phase' | 'is_playing' | 'teacher_notes'>>) => Promise<void>,
    processChoicePhaseDecisionsFunction: (phaseId: string) => Promise<void>
): GameControllerOutput => {
    const [currentPhaseIdState, setCurrentPhaseIdState] = useState<string | null>(null);
    const [currentSlideIdInPhaseState, setCurrentSlideIdInPhaseState] = useState<number | null>(0);
    const [teacherNotesState, setTeacherNotesState] = useState<Record<string, string>>({});
    const [isPlayingVideoState, setIsPlayingVideoState] = useState<boolean>(false);
    const [videoCurrentTimeState, setVideoCurrentTimeState] = useState<number>(0);
    const [triggerVideoSeekState, setTriggerVideoSeekState] = useState<boolean>(false);
    const [currentTeacherAlertState, setCurrentTeacherAlertState] = useState<{
        title: string;
        message: string
    } | null>(null);

    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        if (!gameStructure) return [];
        return [
            ...(gameStructure.welcome_phases || []),
            ...gameStructure.rounds.flatMap(round => round.phases),
            ...(gameStructure.game_end_phases || []),
        ];
    }, [gameStructure]);

    useEffect(() => {
        if (dbSession) {
            setCurrentPhaseIdState(dbSession.current_phase_id);
            setCurrentSlideIdInPhaseState(dbSession.current_slide_id_in_phase ?? 0);
            setTeacherNotesState(dbSession.teacher_notes || {});
            setIsPlayingVideoState(dbSession.is_playing || false);
            // videoCurrentTime is transient, not loaded from DB session directly here
        } else {
            const firstPhaseId = gameStructure?.welcome_phases?.[0]?.id || allPhasesInOrder[0]?.id || null;
            setCurrentPhaseIdState(firstPhaseId);
            setCurrentSlideIdInPhaseState(0);
            setTeacherNotesState({});
            setIsPlayingVideoState(false);
            setCurrentTeacherAlertState(null);
            setVideoCurrentTimeState(0);
            setTriggerVideoSeekState(false);
        }
    }, [dbSession, gameStructure, allPhasesInOrder]);

    const currentPhaseNode = useMemo(() => {
        return allPhasesInOrder.find(p => p.id === currentPhaseIdState) || null;
    }, [allPhasesInOrder, currentPhaseIdState]);

    const currentSlideData = useMemo(() => {
        if (!currentPhaseNode || currentSlideIdInPhaseState === null || !gameStructure) return null;
        if (currentPhaseNode.slide_ids.length === 0 && currentSlideIdInPhaseState === 0) return null;
        if (currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length) return null;
        const slideId = currentPhaseNode.slide_ids[currentSlideIdInPhaseState];
        return gameStructure.slides.find(s => s.id === slideId) || null;
    }, [currentPhaseNode, currentSlideIdInPhaseState, gameStructure]);

    const handleTeacherAlertDisplay = useCallback((slide: Slide | null): boolean => {
        if (slide?.teacher_alert) {
            setCurrentTeacherAlertState(slide.teacher_alert);
            if (isPlayingVideoState) { // If video was playing, pause it due to alert
                setIsPlayingVideoState(false);
                if (dbSession) updateSessionInDb({is_playing: false});
            }
            return true;
        }
        return false;
    }, [dbSession, updateSessionInDb, isPlayingVideoState]);

    const clearTeacherAlert = useCallback(() => {
        setCurrentTeacherAlertState(null);
    }, []);

    const selectPhase = useCallback(async (phaseId: string) => {
        const targetPhase = allPhasesInOrder.find(p => p.id === phaseId);
        if (targetPhase && dbSession) {
            setCurrentPhaseIdState(phaseId);
            setCurrentSlideIdInPhaseState(0);
            setIsPlayingVideoState(false);
            setCurrentTeacherAlertState(null);
            setVideoCurrentTimeState(0);
            setTriggerVideoSeekState(true);
            await updateSessionInDb({
                current_phase_id: phaseId,
                current_slide_id_in_phase: 0,
                is_playing: false,
                teacher_notes: teacherNotesState
            });
        }
    }, [allPhasesInOrder, dbSession, updateSessionInDb, teacherNotesState]);

    const nextSlide = useCallback(async () => {
        if (currentTeacherAlertState) return;
        if (currentPhaseNode && currentSlideIdInPhaseState !== null && dbSession) {
            if (handleTeacherAlertDisplay(currentSlideData)) return;

            const isLastSlideInPhase = currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length - 1;
            let nextPhaseId = currentPhaseIdState;
            let nextSlideIndex = currentSlideIdInPhaseState + 1;
            const newIsPlaying = false;

            if (isLastSlideInPhase) {
                if (currentPhaseNode.is_interactive_student_phase && currentPhaseNode.phase_type === 'choice') {
                    await processChoicePhaseDecisionsFunction(currentPhaseNode.id);
                }
                const currentPhaseIndex = allPhasesInOrder.findIndex(p => p.id === currentPhaseIdState);
                if (currentPhaseIndex < allPhasesInOrder.length - 1) {
                    const nextPhaseNode = allPhasesInOrder[currentPhaseIndex + 1];
                    nextPhaseId = nextPhaseNode.id;
                    nextSlideIndex = 0;
                } else {
                    console.log("useGameController: End of game.");
                    await updateSessionInDb({is_complete: true});
                    return;
                }
            }

            setCurrentPhaseIdState(nextPhaseId);
            setCurrentSlideIdInPhaseState(nextSlideIndex);
            setIsPlayingVideoState(newIsPlaying);
            setVideoCurrentTimeState(0);
            setTriggerVideoSeekState(true);
            await updateSessionInDb({
                current_phase_id: nextPhaseId,
                current_slide_id_in_phase: nextSlideIndex,
                is_playing: newIsPlaying
            });
        }
    }, [currentTeacherAlertState, currentPhaseNode, currentSlideIdInPhaseState, dbSession, handleTeacherAlertDisplay, currentSlideData, allPhasesInOrder, updateSessionInDb, processChoicePhaseDecisionsFunction, currentPhaseIdState]);

    const previousSlide = useCallback(async () => {
        if (currentTeacherAlertState) return;
        if (currentPhaseNode && currentSlideIdInPhaseState !== null && dbSession) {
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
            setCurrentPhaseIdState(newPhaseId);
            setCurrentSlideIdInPhaseState(newSlideIndex);
            setIsPlayingVideoState(false);
            setVideoCurrentTimeState(0);
            setTriggerVideoSeekState(true);
            await updateSessionInDb({
                current_phase_id: newPhaseId,
                current_slide_id_in_phase: newSlideIndex,
                is_playing: false
            });
        }
    }, [currentTeacherAlertState, currentPhaseNode, currentSlideIdInPhaseState, dbSession, allPhasesInOrder, updateSessionInDb, currentPhaseIdState]);

    const togglePlayPauseVideo = useCallback(async () => {
        if (currentSlideData?.type === 'video' && dbSession) {
            const newIsPlaying = !isPlayingVideoState;
            setIsPlayingVideoState(newIsPlaying);
            setTriggerVideoSeekState(false);
            await updateSessionInDb({is_playing: newIsPlaying});
        }
    }, [currentSlideData, dbSession, isPlayingVideoState, updateSessionInDb]);

    const setVideoPlaybackState = useCallback(async (playing: boolean, time: number, triggerSeek: boolean = false) => {
        setIsPlayingVideoState(playing);
        setVideoCurrentTimeState(time);
        setTriggerVideoSeekState(triggerSeek);
        if (dbSession && dbSession.is_playing !== playing) { // Only update DB if intended play state differs
            await updateSessionInDb({is_playing: playing});
        }
    }, [dbSession, updateSessionInDb]);

    const updateTeacherNotesForCurrentSlide = useCallback(async (notes: string) => {
        if (currentSlideData && dbSession) {
            const slideKey = currentSlideData.id.toString();
            const newTeacherNotes = {...teacherNotesState, [slideKey]: notes};
            setTeacherNotesState(newTeacherNotes);
            await updateSessionInDb({teacher_notes: newTeacherNotes});
        }
    }, [currentSlideData, dbSession, teacherNotesState, updateSessionInDb]);

    return {
        currentPhaseId: currentPhaseIdState, currentSlideIdInPhase: currentSlideIdInPhaseState,
        currentPhaseNode, currentSlideData, teacherNotes: teacherNotesState,
        isPlayingVideo: isPlayingVideoState, videoCurrentTime: videoCurrentTimeState,
        triggerVideoSeek: triggerVideoSeekState, currentTeacherAlert: currentTeacherAlertState,
        allPhasesInOrder, selectPhase, nextSlide, previousSlide, togglePlayPauseVideo,
        setVideoPlaybackState, updateTeacherNotesForCurrentSlide, clearTeacherAlert,
    };
};