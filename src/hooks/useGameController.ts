// src/hooks/useGameController.ts
import {useState, useEffect, useCallback, useMemo} from 'react';
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

    selectPhase: (phaseId: string) => void;
    nextSlide: () => Promise<void>;
    previousSlide: () => void;
    togglePlayPauseVideo: () => void;
    setVideoPlaybackState: (playing: boolean, time: number, triggerSeek?: boolean) => Promise<void>; // Make async
    updateTeacherNotesForCurrentSlide: (notes: string) => void;
    clearTeacherAlert: () => void;
}

export const useGameController = (
    dbSession: GameSession | null,
    gameStructure: GameStructure | null,
    updateSessionInDb: (updates: Partial<Pick<GameSession, 'current_phase_id' | 'current_slide_id_in_phase' | 'is_playing' | 'teacher_notes' | 'is_complete'>>) => Promise<void>,
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
            // Don't set videoCurrentTimeState from dbSession here, it's transient
        } else { // Initial setup or no session
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
        if (currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length) return null; // Should not happen if nextSlide logic is correct
        const slideId = currentPhaseNode.slide_ids[currentSlideIdInPhaseState];
        return gameStructure.slides.find(s => s.id === slideId) || null;
    }, [currentPhaseNode, currentSlideIdInPhaseState, gameStructure]);

    const handleTeacherAlertDisplay = useCallback((slide: Slide | null): boolean => {
        if (slide?.teacher_alert) {
            setCurrentTeacherAlertState(slide.teacher_alert);
            if (isPlayingVideoState) {
                setIsPlayingVideoState(false); // Internal state
                if (dbSession) updateSessionInDb({is_playing: false}); // DB state
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
                teacher_notes: teacherNotesState // Persist notes
            });
            requestAnimationFrame(() => setTriggerVideoSeekState(false));
        }
    }, [allPhasesInOrder, dbSession, updateSessionInDb, teacherNotesState]);

    const nextSlide = useCallback(async () => {
        if (currentTeacherAlertState) return; // Don't advance if alert is active
        if (currentPhaseNode && currentSlideIdInPhaseState !== null && dbSession) {
            if (handleTeacherAlertDisplay(currentSlideData)) return; // Show alert if present

            const isLastSlideInPhase = currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length - 1;
            let nextPhaseId = currentPhaseIdState;
            let nextSlideIndex = currentSlideIdInPhaseState + 1;

            if (isLastSlideInPhase) {
                // Process decisions for interactive choice phases before moving to the next phase's first slide
                if (currentPhaseNode.is_interactive_student_phase && currentPhaseNode.phase_type === 'choice') {
                    await processChoicePhaseDecisionsFunction(currentPhaseNode.id);
                }

                const currentPhaseIndex = allPhasesInOrder.findIndex(p => p.id === currentPhaseIdState);
                if (currentPhaseIndex < allPhasesInOrder.length - 1) {
                    const nextPhaseNode = allPhasesInOrder[currentPhaseIndex + 1];
                    nextPhaseId = nextPhaseNode.id;
                    nextSlideIndex = 0;
                } else {
                    console.log("useGameController: End of game (last slide of last phase).");
                    await updateSessionInDb({is_complete: true, is_playing: false});
                    return; // No further state updates needed for current slide/phase
                }
            }

            setCurrentPhaseIdState(nextPhaseId);
            setCurrentSlideIdInPhaseState(nextSlideIndex);
            setIsPlayingVideoState(false); // Always pause on slide change
            setVideoCurrentTimeState(0);   // Reset time for new slide
            setTriggerVideoSeekState(true);// Force student display to seek to 0 or new video start

            await updateSessionInDb({
                current_phase_id: nextPhaseId,
                current_slide_id_in_phase: nextSlideIndex,
                is_playing: false
            });
            requestAnimationFrame(() => setTriggerVideoSeekState(false));
        }
    }, [currentTeacherAlertState, currentPhaseNode, currentSlideIdInPhaseState, dbSession, handleTeacherAlertDisplay, currentSlideData, allPhasesInOrder, updateSessionInDb, processChoicePhaseDecisionsFunction, currentPhaseIdState]);

    const previousSlide = useCallback(async () => {
        if (currentTeacherAlertState) return;
        if (currentPhaseNode && currentSlideIdInPhaseState !== null && dbSession) {
            let newPhaseId = currentPhaseIdState;
            let newSlideIndex = currentSlideIdInPhaseState;

            if (currentSlideIdInPhaseState > 0) {
                newSlideIndex = currentSlideIdInPhaseState - 1;
            } else { // At the first slide of the current phase
                const currentPhaseIndex = allPhasesInOrder.findIndex(p => p.id === currentPhaseIdState);
                if (currentPhaseIndex > 0) { // If not the very first phase of the game
                    const prevPhaseNode = allPhasesInOrder[currentPhaseIndex - 1];
                    newPhaseId = prevPhaseNode.id;
                    newSlideIndex = prevPhaseNode.slide_ids.length - 1; // Go to last slide of prev phase
                } else {
                    return; // At the very first slide of the game
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
            requestAnimationFrame(() => setTriggerVideoSeekState(false));
        }
    }, [currentTeacherAlertState, currentPhaseNode, currentSlideIdInPhaseState, dbSession, allPhasesInOrder, updateSessionInDb, currentPhaseIdState]);

    // This is for the MAIN Play/Pause button in TeacherGameControls
    const togglePlayPauseVideo = useCallback(async () => {
        if (currentTeacherAlertState) { // If an alert is active, dismiss it instead of toggling video
            clearTeacherAlert();
            return;
        }
        if (currentSlideData?.type === 'video' && dbSession) {
            const newIsPlaying = !isPlayingVideoState;
            console.log(`[GameController] togglePlayPauseVideo (MAIN BUTTON): Setting isPlaying to ${newIsPlaying}. Time: ${videoCurrentTimeState.toFixed(2)}`);
            setIsPlayingVideoState(newIsPlaying);
            setTriggerVideoSeekState(false); // This is a play/pause, not a seek
            await updateSessionInDb({is_playing: newIsPlaying});
        }
    }, [currentSlideData, dbSession, isPlayingVideoState, updateSessionInDb, videoCurrentTimeState, currentTeacherAlertState, clearTeacherAlert]);

    // This is called by the Teacher Preview's video events (onPlay, onPause, onSeeked)
    const setVideoPlaybackState = useCallback(async (playingFromPreview: boolean, timeFromPreview: number, seekTriggeredByPreview: boolean = false) => {
        if (!dbSession) return;

        let newGlobalIsPlayingTarget = playingFromPreview;
        let newGlobalTriggerSeek = false;

        if (seekTriggeredByPreview) {
            console.log(`[GameController] setVideoPlaybackState (from PREVIEW SEEK): Forcing PAUSE. Target time: ${timeFromPreview.toFixed(2)}`);
            newGlobalIsPlayingTarget = false; // Force pause on any seek from preview
            newGlobalTriggerSeek = true;      // Signal a seek is required
        } else {
            // If just play/pause from preview, reflect that state.
            // No general seek trigger unless explicitly a seek event.
            console.log(`[GameController] setVideoPlaybackState (from PREVIEW PLAY/PAUSE): Preview is ${playingFromPreview ? 'playing' : 'paused'}. Time: ${timeFromPreview.toFixed(2)}`);
            newGlobalTriggerSeek = false;
        }

        // Update local controller state immediately for responsiveness of preview
        setIsPlayingVideoState(newGlobalIsPlayingTarget);
        setVideoCurrentTimeState(timeFromPreview);
        if (newGlobalTriggerSeek) {
            setTriggerVideoSeekState(true);
            requestAnimationFrame(() => setTriggerVideoSeekState(false)); // Pulse the seek trigger
        } else {
            setTriggerVideoSeekState(false); // Ensure it's false if not a seek
        }

        // Update DB (and thus trigger broadcast via AppContext) only if global play state needs to change
        if (dbSession.is_playing !== newGlobalIsPlayingTarget) {
            await updateSessionInDb({is_playing: newGlobalIsPlayingTarget});
        } else if (newGlobalTriggerSeek) {
            // If play state hasn't changed but it's a seek, we still need to ensure AppContext's useEffect
            // watching gameController states picks up the time and seek trigger to broadcast.
            // The local state updates to videoCurrentTimeState and triggerVideoSeekState should
            // cause AppContext's effect to run and broadcast.
            // No explicit updateSessionInDb needed if ONLY time/seek changed without play state.
            // This relies on AppContext watching videoCurrentTimeState and triggerVideoSeekState.
            console.log(`[GameController] Seek detected, play state unchanged. Broadcast will be handled by AppContext effect watching time/seek trigger.`);
        }

    }, [dbSession, updateSessionInDb]);

    const updateTeacherNotesForCurrentSlide = useCallback(async (notes: string) => {
        if (currentSlideData && dbSession) {
            const slideKey = String(currentSlideData.id); // Ensure key is string
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