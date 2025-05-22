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

    selectPhase: (phaseId: string) => void;
    nextSlide: () => Promise<void>;
    previousSlide: () => Promise<void>; // Made async for consistency
    togglePlayPauseVideo: () => Promise<void>; // Made async
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
    processChoicePhaseDecisionsFunction: (phaseId: string) => Promise<void> // This is for CH1, CH2, etc.
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
        if (!gameStructure) return [];
        return [
            ...(gameStructure.welcome_phases || []),
            ...gameStructure.rounds.flatMap(round => round.phases || []), // Added || [] for safety
            ...(gameStructure.game_end_phases || []),
        ];
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
        if (currentPhaseNode.slide_ids.length === 0 && currentSlideIdInPhaseState === 0) return null;
        if (currentSlideIdInPhaseState < 0 || currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length) {
            console.warn(`[GameController] Invalid slide index ${currentSlideIdInPhaseState} for phase ${currentPhaseNode.id}. Max index: ${currentPhaseNode.slide_ids.length -1}.`);
            return null;
        }
        const slideId = currentPhaseNode.slide_ids[currentSlideIdInPhaseState];
        return gameStructure.slides.find(s => s.id === slideId) || null;
    }, [currentPhaseNode, currentSlideIdInPhaseState, gameStructure?.slides]);

    useEffect(() => {
        // Reset video duration when slide changes to a video type
        if (currentSlideData?.type === 'video' || (currentSlideData?.type === 'interactive_invest' && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i))) {
            setCurrentVideoDurationState(null);
        }
        // Reset submission status when slide changes, AppContext will update it based on new phase/slide context
        setAllTeamsSubmittedCurrentInteractivePhaseState(false);
    }, [currentSlideData]);

    const reportVideoDuration = useCallback((duration: number) => {
        // console.log(`[GameController] Video duration reported: ${duration}`);
        setCurrentVideoDurationState(duration);
    }, []);

    const advanceToNextSlideInternal = useCallback(async () => {
        if (!currentPhaseNode || currentSlideIdInPhaseState === null || !dbSession || !gameStructure) return;

        const isLastSlideInPhase = currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length - 1;
        let nextPhaseId = currentPhaseIdState;
        let nextSlideIndexInPhase = currentSlideIdInPhaseState + 1;

        if (isLastSlideInPhase) {
            // If it's the last slide of an interactive choice phase, process decisions
            if (currentPhaseNode.is_interactive_student_phase && currentPhaseNode.phase_type === 'choice') {
                console.log(`[GameController] Processing decisions for choice phase: ${currentPhaseNode.id}`);
                await processChoicePhaseDecisionsFunction(currentPhaseNode.id);
            }

            const currentOverallPhaseIndex = allPhasesInOrder.findIndex(p => p.id === currentPhaseIdState);
            if (currentOverallPhaseIndex < allPhasesInOrder.length - 1) {
                const nextPhaseNodeCandidate = allPhasesInOrder[currentOverallPhaseIndex + 1];
                nextPhaseId = nextPhaseNodeCandidate.id;
                nextSlideIndexInPhase = 0;
            } else {
                console.log("[GameController] End of game reached (last slide of last phase).");
                await updateSessionInDb({is_complete: true, is_playing: false});
                return;
            }
        }

        setCurrentPhaseIdState(nextPhaseId);
        setCurrentSlideIdInPhaseState(nextSlideIndexInPhase);
        setIsPlayingVideoState(false);
        setVideoCurrentTimeState(0);
        setTriggerVideoSeekState(true); // Seek to start of new slide's video if any
        setAllTeamsSubmittedCurrentInteractivePhaseState(false); // Reset for new slide/phase
        setCurrentVideoDurationState(null); // Reset video duration for new slide

        await updateSessionInDb({
            current_phase_id: nextPhaseId,
            current_slide_id_in_phase: nextSlideIndexInPhase,
            is_playing: false
        });
        requestAnimationFrame(() => setTriggerVideoSeekState(false));

    }, [currentPhaseNode, currentSlideIdInPhaseState, dbSession, gameStructure, allPhasesInOrder, updateSessionInDb, processChoicePhaseDecisionsFunction, currentPhaseIdState]);

    const checkAndDisplayAlertForCurrentSlide = useCallback((): boolean => {
        if (!currentSlideData || currentTeacherAlertState) return false;

        let alertToShow = currentSlideData.teacher_alert; // Default alert from slide data

        // Special handling for Slide 8 (RD-1 Invest video timer)
        if (currentSlideData.id === 8 && currentSlideData.type === 'interactive_invest') {
            if (allTeamsSubmittedCurrentInteractivePhaseState) {
                console.log("[GameController] All teams submitted for RD-1 Invest. Using slide's teacher_alert.");
                // The alert defined on Slide 8 is already appropriate for "period ended"
            } else {
                // If not all submitted, don't show the default "period ended" alert yet.
                // The teacher might be forcing next, which is handled in nextSlide().
                return false;
            }
        }

        if (alertToShow) {
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
                console.log("[GameController] useEffect: All teams submitted for invest phase (Slide 8), attempting to show alert.");
                checkAndDisplayAlertForCurrentSlide();
            }
        } else if (currentSlideData?.teacher_alert && currentSlideData.id !== 8) {
            // For other slides with alerts, check if it should be displayed.
            // Avoid re-showing the same alert if it's already active.
            if (!currentTeacherAlertState || (currentTeacherAlertState.title !== currentSlideData.teacher_alert.title || currentTeacherAlertState.message !== currentSlideData.teacher_alert.message)) {
                checkAndDisplayAlertForCurrentSlide();
            }
        }
    }, [allTeamsSubmittedCurrentInteractivePhaseState, currentSlideData, checkAndDisplayAlertForCurrentSlide, currentTeacherAlertState]);


    const nextSlide = useCallback(async () => {
        if (currentTeacherAlertState) {
            // This case should ideally be handled by the modal's OK button calling clearTeacherAlert.
            // If nextSlide is called directly while an alert is up, it might imply teacher wants to bypass something.
            // For now, let's assume clearTeacherAlert will handle the advancement.
            console.warn("[GameController] nextSlide called while alert is active. Alert should be cleared first.");
            return;
        }

        // Specific logic for Slide 8 (RD-1 Invest video timer)
        if (currentSlideData?.id === 8 && currentSlideData.type === 'interactive_invest') {
            if (!allTeamsSubmittedCurrentInteractivePhaseState) {
                const confirmAdvance = window.confirm("Not all teams have submitted their RD-1 investments. The 15-minute timer might still be running. Do you want to end the investment period early and proceed?");
                if (!confirmAdvance) {
                    return; // Teacher chose not to advance
                }
                // If teacher confirms early advance, show the slide's defined "period ended" alert.
                // The actual advancement will happen when this alert is cleared.
                if (currentSlideData.teacher_alert && !currentTeacherAlertState) {
                    setCurrentTeacherAlertState(currentSlideData.teacher_alert);
                    if (isPlayingVideoState && dbSession) updateSessionInDb({ is_playing: false });
                    setIsPlayingVideoState(false);
                    return;
                }
            } else { // All teams have submitted for Slide 8
                // If an alert isn't already showing (e.g. from the useEffect), show it now.
                if (!currentTeacherAlertState && currentSlideData.teacher_alert) {
                    setCurrentTeacherAlertState(currentSlideData.teacher_alert);
                    if (isPlayingVideoState && dbSession) updateSessionInDb({ is_playing: false });
                    setIsPlayingVideoState(false);
                    return;
                }
            }
        }
        // For other slides that might have a teacher_alert (not Slide 8's special case)
        else if (currentSlideData?.teacher_alert) {
            if (checkAndDisplayAlertForCurrentSlide()) { // This function now returns true if an alert was set
                return; // Alert displayed, advancement will happen via clearTeacherAlert
            }
        }

        // If no alerts were set or needed special handling, proceed to advance.
        await advanceToNextSlideInternal();
    }, [currentTeacherAlertState, currentSlideData, advanceToNextSlideInternal, allTeamsSubmittedCurrentInteractivePhaseState, checkAndDisplayAlertForCurrentSlide, isPlayingVideoState, dbSession, updateSessionInDb]);


    const clearTeacherAlert = useCallback(async () => {
        setCurrentTeacherAlertState(null);
        // console.log("[GameController] Alert cleared. Advancing to next slide.");
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
        // Allow play/pause for 'video' type or 'interactive_invest' type if it has a source_url (like our Slide 8)
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