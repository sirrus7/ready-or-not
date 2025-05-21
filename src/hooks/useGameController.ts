// src/hooks/useGameController.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { GameSession, GameStructure, GamePhaseNode, Slide } from '../types';

interface GameControllerOutput {
    // State directly managed or derived by this hook
    currentPhaseId: string | null;
    currentSlideIdInPhase: number | null;
    currentPhaseNode: GamePhaseNode | null;
    currentSlideData: Slide | null;
    teacherNotes: Record<number, string>; // Slide-specific notes
    isPlayingVideo: boolean;
    currentTeacherAlert: { title: string; message: string } | null;
    allPhasesInOrder: GamePhaseNode[]; // Exposing this for UI like JourneyMap

    // Actions
    selectPhase: (phaseId: string) => void;
    nextSlide: () => Promise<void>; // Make async if it awaits processPhaseDecisions
    previousSlide: () => void;
    togglePlayPauseVideo: () => void;
    updateTeacherNotesForCurrentSlide: (notes: string) => void;
    clearTeacherAlert: () => void;
    processCurrentPhaseDecisionsIfNeeded: () => Promise<void>; // To be called by nextSlide
}

export const useGameController = (
    dbSession: GameSession | null, // Session data from useSessionManager
    gameStructure: GameStructure | null,
    updateSessionInDb: (updates: Partial<Pick<GameSession, 'current_phase_id' | 'current_slide_id_in_phase' | 'is_playing' | 'teacher_notes'>>) => Promise<void>,
    // processPhaseDecisionsFunction will be passed from AppContext eventually, which uses useGameLogicProcessor
    processPhaseDecisionsFunction: (phaseId: string) => Promise<void>
): GameControllerOutput => {
    const [currentPhaseId, setCurrentPhaseId] = useState<string | null>(null);
    const [currentSlideIdInPhase, setCurrentSlideIdInPhase] = useState<number | null>(null);
    const [teacherNotes, setTeacherNotes] = useState<Record<number, string>>({});
    const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
    const [currentTeacherAlert, setCurrentTeacherAlert] = useState<{ title: string; message: string } | null>(null);

    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        if (!gameStructure) return [];
        return [
            ...gameStructure.welcome_phases,
            ...gameStructure.rounds.flatMap(round => round.phases),
            ...gameStructure.game_end_phases,
        ];
    }, [gameStructure]);

    // Sync with dbSession changes from useSessionManager
    useEffect(() => {
        if (dbSession) {
            setCurrentPhaseId(dbSession.current_phase_id);
            setCurrentSlideIdInPhase(dbSession.current_slide_id_in_phase ?? 0);
            setTeacherNotes(dbSession.teacher_notes || {});
            setIsPlayingVideo(dbSession.is_playing || false);
        } else { // Reset if session is null (e.g., logged out, error)
            setCurrentPhaseId(gameStructure?.welcome_phases[0]?.id || null);
            setCurrentSlideIdInPhase(0);
            setTeacherNotes({});
            setIsPlayingVideo(false);
            setCurrentTeacherAlert(null);
        }
    }, [dbSession, gameStructure]);


    const currentPhaseNode = useMemo(() => {
        return allPhasesInOrder.find(p => p.id === currentPhaseId) || null;
    }, [allPhasesInOrder, currentPhaseId]);

    const currentSlideData = useMemo(() => {
        if (!currentPhaseNode || currentSlideIdInPhase === null || !gameStructure) return null;
        if (currentPhaseNode.slide_ids.length === 0 && currentSlideIdInPhase === 0) return null;
        if (currentSlideIdInPhase >= currentPhaseNode.slide_ids.length) return null;
        const slideId = currentPhaseNode.slide_ids[currentSlideIdInPhase];
        return gameStructure.slides.find(s => s.id === slideId) || null;
    }, [currentPhaseNode, currentSlideIdInPhase, gameStructure]);

    const handleTeacherAlertDisplay = useCallback((slide: Slide | null): boolean => {
        if (slide?.teacher_alert) {
            setCurrentTeacherAlert(slide.teacher_alert);
            setIsPlayingVideo(false); // Pause video if alert shows
            if (dbSession) updateSessionInDb({ is_playing: false });
            return true;
        }
        return false;
    }, [dbSession, updateSessionInDb]);

    const clearTeacherAlert = useCallback(() => {
        setCurrentTeacherAlert(null);
    }, []);

    const selectPhase = useCallback(async (phaseId: string) => {
        const targetPhase = allPhasesInOrder.find(p => p.id === phaseId);
        if (targetPhase && dbSession) {
            setCurrentPhaseId(phaseId);
            setCurrentSlideIdInPhase(0);
            setIsPlayingVideo(false);
            setCurrentTeacherAlert(null);
            await updateSessionInDb({ current_phase_id: phaseId, current_slide_id_in_phase: 0, is_playing: false });
        }
    }, [allPhasesInOrder, dbSession, updateSessionInDb]);

    const processCurrentPhaseDecisionsIfNeeded = useCallback(async () => {
        if (currentPhaseNode?.is_interactive_student_phase && dbSession) {
            console.log(`useGameController: Processing decisions for phase ${currentPhaseNode.id}`);
            await processPhaseDecisionsFunction(currentPhaseNode.id);
        }
    }, [currentPhaseNode, dbSession, processPhaseDecisionsFunction]);

    const nextSlide = useCallback(async () => {
        if (currentTeacherAlert) { console.warn("useGameController: Alert active, cannot advance slide."); return; }
        if (currentPhaseNode && currentSlideIdInPhase !== null && dbSession) {
            if (handleTeacherAlertDisplay(currentSlideData)) return;

            const isLastSlideInPhase = currentSlideIdInPhase >= currentPhaseNode.slide_ids.length - 1;
            if (isLastSlideInPhase) {
                if (currentPhaseNode.is_interactive_student_phase) {
                    await processCurrentPhaseDecisionsIfNeeded();
                }
                const currentPhaseIndex = allPhasesInOrder.findIndex(p => p.id === currentPhaseId);
                if (currentPhaseIndex < allPhasesInOrder.length - 1) {
                    const nextPhaseNode = allPhasesInOrder[currentPhaseIndex + 1];
                    setCurrentPhaseId(nextPhaseNode.id);
                    setCurrentSlideIdInPhase(0);
                    setIsPlayingVideo(false);
                    await updateSessionInDb({ current_phase_id: nextPhaseNode.id, current_slide_id_in_phase: 0, is_playing: false });
                } else { console.log("useGameController: End of game."); /* Optionally update session to complete */ }
            } else {
                const newSlideIndex = currentSlideIdInPhase + 1;
                setCurrentSlideIdInPhase(newSlideIndex);
                await updateSessionInDb({ current_slide_id_in_phase: newSlideIndex });
            }
        }
    }, [currentTeacherAlert, currentPhaseNode, currentSlideIdInPhase, dbSession, handleTeacherAlertDisplay, currentSlideData, allPhasesInOrder, updateSessionInDb, processCurrentPhaseDecisionsIfNeeded, currentPhaseId]);

    const previousSlide = useCallback(async () => {
        if (currentTeacherAlert) return;
        if (currentPhaseNode && currentSlideIdInPhase !== null && dbSession) {
            if (currentSlideIdInPhase > 0) {
                const newSlideIndex = currentSlideIdInPhase - 1;
                setCurrentSlideIdInPhase(newSlideIndex);
                setIsPlayingVideo(false); // Stop video when navigating
                await updateSessionInDb({ current_slide_id_in_phase: newSlideIndex, is_playing: false });
            } else {
                const currentPhaseIndex = allPhasesInOrder.findIndex(p => p.id === currentPhaseId);
                if (currentPhaseIndex > 0) {
                    const prevPhaseNode = allPhasesInOrder[currentPhaseIndex - 1];
                    setCurrentPhaseId(prevPhaseNode.id);
                    setCurrentSlideIdInPhase(prevPhaseNode.slide_ids.length - 1);
                    setIsPlayingVideo(false);
                    await updateSessionInDb({ current_phase_id: prevPhaseNode.id, current_slide_id_in_phase: prevPhaseNode.slide_ids.length - 1, is_playing: false });
                }
            }
        }
    }, [currentTeacherAlert, currentPhaseNode, currentSlideIdInPhase, dbSession, allPhasesInOrder, updateSessionInDb, currentPhaseId]);

    const togglePlayPauseVideo = useCallback(async () => {
        if (currentSlideData?.type === 'video' && dbSession) {
            const newIsPlaying = !isPlayingVideo;
            setIsPlayingVideo(newIsPlaying);
            await updateSessionInDb({ is_playing: newIsPlaying });
        }
    }, [currentSlideData, dbSession, isPlayingVideo, updateSessionInDb]);

    const updateTeacherNotesForCurrentSlide = useCallback(async (notes: string) => {
        if (currentSlideData && dbSession) {
            const newTeacherNotes = { ...teacherNotes, [currentSlideData.id]: notes };
            setTeacherNotes(newTeacherNotes);
            await updateSessionInDb({ teacher_notes: newTeacherNotes });
        }
    }, [currentSlideData, dbSession, teacherNotes, updateSessionInDb]);


    return {
        currentPhaseId,
        currentSlideIdInPhase,
        currentPhaseNode,
        currentSlideData,
        teacherNotes,
        isPlayingVideo,
        currentTeacherAlert,
        allPhasesInOrder,
        selectPhase,
        nextSlide,
        previousSlide,
        togglePlayPauseVideo,
        updateTeacherNotesForCurrentSlide,
        clearTeacherAlert,
        processCurrentPhaseDecisionsIfNeeded,
    };
};