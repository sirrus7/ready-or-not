// src/hooks/useGameController.tsx
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

    allTeamsSubmittedCurrentInteractivePhase: boolean;
    setAllTeamsSubmittedCurrentInteractivePhase: (submitted: boolean) => void;

    selectPhase: (phaseId: string) => Promise<void>; // Made async
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>;
    togglePlayPauseVideo: () => Promise<void>;
    setVideoPlaybackState: (playing: boolean, time: number, triggerSeek?: boolean) => Promise<void>;
    updateTeacherNotesForCurrentSlide: (notes: string) => void;
    clearTeacherAlert: () => Promise<void>;
    currentVideoDuration: number | null;
    reportVideoDuration: (duration: number) => void;
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
    const [currentVideoDurationState, setCurrentVideoDurationState] = useState<number | null>(null);
    const [allTeamsSubmittedCurrentInteractivePhaseState, setAllTeamsSubmittedCurrentInteractivePhaseState] = useState<boolean>(false);

    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        if (!gameStructure?.allPhases) return [];
        return gameStructure.allPhases;
    }, [gameStructure]);

    useEffect(() => {
        if (dbSession) {
            setCurrentPhaseIdState(dbSession.current_phase_id);
            setCurrentSlideIdInPhaseState(dbSession.current_slide_id_in_phase ?? 0);
            setTeacherNotesState(dbSession.teacher_notes || {});
            setIsPlayingVideoState(dbSession.is_playing || false);
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
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

    const currentPhaseNode = useMemo(() => {
        if (!currentPhaseIdState) return null;
        return allPhasesInOrder.find(p => p.id === currentPhaseIdState) || null;
    }, [allPhasesInOrder, currentPhaseIdState]);

    const currentSlideData = useMemo(() => {
        if (!currentPhaseNode || currentSlideIdInPhaseState === null || !gameStructure?.slides) return null;
        if (currentPhaseNode.slide_ids.length === 0 && currentSlideIdInPhaseState === 0 && currentPhaseNode.slide_ids[0] === undefined) return null; // Handles empty slide_ids for a phase
        if (currentSlideIdInPhaseState < 0 || currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length) {
            console.warn(`[GameController] Invalid slide index ${currentSlideIdInPhaseState} for phase ${currentPhaseNode.id}. Max index: ${currentPhaseNode.slide_ids.length -1}.`);
            return null;
        }
        const slideId = currentPhaseNode.slide_ids[currentSlideIdInPhaseState];
        const foundSlide = gameStructure.slides.find(s => s.id === slideId) || null;
        console.log(`[GameController] currentSlideData for ID ${slideId}:`, foundSlide); // Add this log
        return foundSlide;
    }, [currentPhaseNode, currentSlideIdInPhaseState, gameStructure?.slides]);

    useEffect(() => {
        if (currentSlideData?.type === 'video' || (currentSlideData?.type === 'interactive_invest' && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i))) {
            setCurrentVideoDurationState(null);
        }
        setAllTeamsSubmittedCurrentInteractivePhaseState(false);
    }, [currentSlideData]);

    const reportVideoDuration = useCallback((duration: number) => {
        setCurrentVideoDurationState(duration);
    }, []);

    const advanceToNextSlideInternal = useCallback(async () => {
        if (!currentPhaseNode || currentSlideIdInPhaseState === null || !dbSession || !gameStructure || !allPhasesInOrder.length) return;

        const isLastSlideInPhase = currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length - 1;
        let nextPhaseId = currentPhaseIdState;
        let nextSlideIndexInPhase = currentSlideIdInPhaseState + 1;

        if (isLastSlideInPhase) {
            if (currentPhaseNode.is_interactive_student_phase && currentPhaseNode.phase_type === 'choice') {
                // console.log(`[GameController] Processing decisions for choice phase: ${currentPhaseNode.id}`);
                await processChoicePhaseDecisionsFunction(currentPhaseNode.id);
            }

            const currentOverallPhaseIndex = allPhasesInOrder.findIndex(p => p.id === currentPhaseIdState);
            if (currentOverallPhaseIndex < allPhasesInOrder.length - 1) {
                const nextPhaseNodeCandidate = allPhasesInOrder[currentOverallPhaseIndex + 1];
                nextPhaseId = nextPhaseNodeCandidate.id;
                nextSlideIndexInPhase = 0;
            } else {
                // console.log("[GameController] End of game reached (last slide of last phase).");
                await updateSessionInDb({is_complete: true, is_playing: false});
                return;
            }
        }

        setCurrentPhaseIdState(nextPhaseId);
        setCurrentSlideIdInPhaseState(nextSlideIndexInPhase);
        setIsPlayingVideoState(false);
        setVideoCurrentTimeState(0);
        setTriggerVideoSeekState(true);
        setAllTeamsSubmittedCurrentInteractivePhaseState(false);
        setCurrentVideoDurationState(null);

        await updateSessionInDb({
            current_phase_id: nextPhaseId,
            current_slide_id_in_phase: nextSlideIndexInPhase,
            is_playing: false
        });
        requestAnimationFrame(() => setTriggerVideoSeekState(false));

    }, [currentPhaseNode, currentSlideIdInPhaseState, dbSession, gameStructure, allPhasesInOrder, updateSessionInDb, processChoicePhaseDecisionsFunction, currentPhaseIdState]);

    const checkAndDisplayAlertForCurrentSlide = useCallback((): boolean => {
        if (!currentSlideData || currentTeacherAlertState) return false;

        let alertToShow = currentSlideData.teacher_alert;

        if (currentSlideData.id === 8 && currentSlideData.type === 'interactive_invest') {
            if (allTeamsSubmittedCurrentInteractivePhaseState) {
                // console.log("[GameController] All teams submitted for Slide 8 (Invest). Using slide's teacher_alert.");
                // Alert from slide 8 is already "Investment Period Concluded"
            } else {
                return false; // Don't show the default "period ended" alert if not all submitted for slide 8
            }
        }

        if (alertToShow) {
            // console.log(`[GameController] Displaying alert: ${alertToShow.title}`);
            setCurrentTeacherAlertState(alertToShow);
            if (isPlayingVideoState) {
                setIsPlayingVideoState(false);
                if (dbSession) updateSessionInDb({is_playing: false});
            }
            return true;
        }
        return false;
    }, [currentSlideData, dbSession, isPlayingVideoState, updateSessionInDb, allTeamsSubmittedCurrentInteractivePhaseState, currentTeacherAlertState]);

    useEffect(() => {
        if (currentSlideData?.id === 8 && currentSlideData.type === 'interactive_invest' && allTeamsSubmittedCurrentInteractivePhaseState) {
            if (!currentTeacherAlertState) {
                // console.log("[GameController] useEffect: All teams submitted for invest phase (Slide 8), attempting to show defined alert.");
                checkAndDisplayAlertForCurrentSlide(); // This will use the alert defined on slide 8
            }
        } else if (currentSlideData?.teacher_alert && currentSlideData.id !== 8) {
            if (!currentTeacherAlertState || (currentTeacherAlertState.title !== currentSlideData.teacher_alert.title || currentTeacherAlertState.message !== currentSlideData.teacher_alert.message)) {
                checkAndDisplayAlertForCurrentSlide();
            }
        }
    }, [allTeamsSubmittedCurrentInteractivePhaseState, currentSlideData, checkAndDisplayAlertForCurrentSlide, currentTeacherAlertState]);


    const nextSlide = useCallback(async () => {
        if (currentTeacherAlertState) {
            console.warn("[GameController] nextSlide called while alert is active. Alert should be cleared via its OK button.");
            return;
        }

        if (currentSlideData?.id === 8 && currentSlideData.type === 'interactive_invest') { // Special handling for RD-1 Invest video timer slide
            if (!allTeamsSubmittedCurrentInteractivePhaseState) {
                const confirmAdvance = window.confirm("Not all teams have submitted RD-1 investments. The 15-minute timer might still be running. End the investment period early and proceed?");
                if (!confirmAdvance) {
                    return;
                }
            }
            // If all submitted OR teacher confirmed early advance, show the standard "period ended" alert.
            // The actual advancement will happen when this alert is cleared via clearTeacherAlert.
            if (currentSlideData.teacher_alert && !currentTeacherAlertState) {
                setCurrentTeacherAlertState(currentSlideData.teacher_alert);
                if (isPlayingVideoState && dbSession) {
                    await updateSessionInDb({ is_playing: false }); // Ensure DB reflects pause
                    setIsPlayingVideoState(false);
                }
                return;
            }
            // If alert was already shown (e.g. by allTeamsSubmitted) and teacher clicks next, this will be handled by clearTeacherAlert.
            // If no alert defined on slide 8 for some reason, just advance.
            if (!currentSlideData.teacher_alert) {
                await advanceToNextSlideInternal();
                return;
            }

        } else if (currentSlideData?.teacher_alert) {
            if (checkAndDisplayAlertForCurrentSlide()) {
                return;
            }
        }

        await advanceToNextSlideInternal();
    }, [currentTeacherAlertState, currentSlideData, advanceToNextSlideInternal, allTeamsSubmittedCurrentInteractivePhaseState, checkAndDisplayAlertForCurrentSlide, isPlayingVideoState, dbSession, updateSessionInDb]);


    const clearTeacherAlert = useCallback(async () => {
        setCurrentTeacherAlertState(null);
        await advanceToNextSlideInternal();
    }, [advanceToNextSlideInternal]);


    const selectPhase = useCallback(async (phaseId: string) => {
        const targetPhase = allPhasesInOrder.find(p => p.id === phaseId);
        if (targetPhase && dbSession) {
            setCurrentPhaseIdState(phaseId);
            setCurrentSlideIdInPhaseState(0);
            setIsPlayingVideoState(false);
            setCurrentTeacherAlertState(null);
            setVideoCurrentTimeState(0);
            setTriggerVideoSeekState(true);
            setCurrentVideoDurationState(null);
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
            await updateSessionInDb({
                current_phase_id: phaseId,
                current_slide_id_in_phase: 0,
                is_playing: false,
                teacher_notes: teacherNotesState
            });
            requestAnimationFrame(() => setTriggerVideoSeekState(false));
        }
    }, [allPhasesInOrder, dbSession, updateSessionInDb, teacherNotesState]);

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
            setCurrentVideoDurationState(null);
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
            await updateSessionInDb({
                current_phase_id: newPhaseId,
                current_slide_id_in_phase: newSlideIndex,
                is_playing: false
            });
            requestAnimationFrame(() => setTriggerVideoSeekState(false));
        }
    }, [currentTeacherAlertState, currentPhaseNode, currentSlideIdInPhaseState, dbSession, allPhasesInOrder, updateSessionInDb, currentPhaseIdState]);

    const togglePlayPauseVideo = useCallback(async () => {
        if (currentTeacherAlertState) {
            await clearTeacherAlert();
            return;
        }
        if ((currentSlideData?.type === 'video' ||
                (currentSlideData?.type === 'interactive_invest' && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i)))
            && dbSession) {
            const newIsPlaying = !isPlayingVideoState;
            setIsPlayingVideoState(newIsPlaying);
            setTriggerVideoSeekState(false);
            await updateSessionInDb({is_playing: newIsPlaying});
        }
    }, [currentSlideData, dbSession, isPlayingVideoState, updateSessionInDb, currentTeacherAlertState, clearTeacherAlert]);

    const setVideoPlaybackState = useCallback(async (playingFromPreview: boolean, timeFromPreview: number, seekTriggeredByPreview: boolean = false) => {
        if (!dbSession) return;
        let newGlobalIsPlayingTarget = playingFromPreview;
        let newGlobalTriggerSeek = false;

        if (seekTriggeredByPreview) {
            newGlobalIsPlayingTarget = false;
            newGlobalTriggerSeek = true;
        } else {
            // If just play/pause from preview, we want the global state to reflect the preview's direct action.
            // The `togglePlayPauseVideo` is for the main button. This `setVideoPlaybackState` is from preview events.
            newGlobalIsPlayingTarget = playingFromPreview;
            newGlobalTriggerSeek = false;
        }

        setIsPlayingVideoState(newGlobalIsPlayingTarget);
        setVideoCurrentTimeState(timeFromPreview);
        if (newGlobalTriggerSeek) {
            setTriggerVideoSeekState(true);
            requestAnimationFrame(() => setTriggerVideoSeekState(false));
        } else {
            setTriggerVideoSeekState(false);
        }
        if (dbSession.is_playing !== newGlobalIsPlayingTarget) {
            await updateSessionInDb({ is_playing: newGlobalIsPlayingTarget });
        }
    }, [dbSession, updateSessionInDb]);

    const updateTeacherNotesForCurrentSlide = useCallback(async (notes: string) => {
        if (currentSlideData && dbSession) {
            const slideKey = String(currentSlideData.id);
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
        allPhasesInOrder,
        allTeamsSubmittedCurrentInteractivePhase: allTeamsSubmittedCurrentInteractivePhaseState,
        setAllTeamsSubmittedCurrentInteractivePhase: setAllTeamsSubmittedCurrentInteractivePhaseState,

        selectPhase, nextSlide, previousSlide, togglePlayPauseVideo,
        setVideoPlaybackState, updateTeacherNotesForCurrentSlide, clearTeacherAlert,
        currentVideoDuration: currentVideoDurationState,
        reportVideoDuration,
    };
};