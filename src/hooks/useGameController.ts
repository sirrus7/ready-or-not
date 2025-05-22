// src/hooks/useGameController.ts
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
    togglePlayPauseVideo: () => Promise<void>;
    setVideoPlaybackState: (playing: boolean, time: number, triggerSeek?: boolean) => Promise<void>;
    updateTeacherNotesForCurrentSlide: (notes: string) => void;
    clearTeacherAlert: () => Promise<void>;
    currentVideoDuration: number | null;
    reportVideoDuration: (duration: number) => void;
    handlePreviewVideoEnded: () => Promise<void>;

    setCurrentTeacherAlertState: (alert: { title: string; message: string } | null) => void;
}

export const useGameController = (
    dbSession: GameSession | null,
    gameStructure: GameStructure | null,
    updateSessionInDb: (updates: Partial<Pick<GameSession, 'current_phase_id' | 'current_slide_id_in_phase' | 'is_playing' | 'teacher_notes' | 'is_complete'>>) => Promise<void>,
    processChoicePhaseDecisionsFunction: (phaseId: string, associatedSlide: Slide | null) => Promise<void>
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

    const justSeekedRef = useRef(false);
    const lastManualToggleTimestamp = useRef(0);
    const slideLoadTimestamp = useRef(0);

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
        if (currentPhaseNode.slide_ids.length === 0) return null;
        if (currentSlideIdInPhaseState < 0 || currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length) {
            return null;
        }
        const slideId = currentPhaseNode.slide_ids[currentSlideIdInPhaseState];
        return gameStructure.slides.find(s => s.id === slideId) || null;
    }, [currentPhaseNode, currentSlideIdInPhaseState, gameStructure?.slides]);

    const handleTeacherAlertDisplay = useCallback((slide: Slide | null): boolean => {
        if (!slide || !slide.teacher_alert) {
            if(currentTeacherAlertState) setCurrentTeacherAlertState(null);
            return false;
        }
        if (currentTeacherAlertState?.title === slide.teacher_alert.title && currentTeacherAlertState?.message === slide.teacher_alert.message) {
            return true;
        }
        setCurrentTeacherAlertState(slide.teacher_alert);
        if (isPlayingVideoState) {
            setIsPlayingVideoState(false);
            if (dbSession && dbSession.is_playing) updateSessionInDb({is_playing: false});
        }
        return true;
    }, [dbSession, updateSessionInDb, isPlayingVideoState, currentTeacherAlertState]);

    useEffect(() => {
        if (currentSlideData) {
            slideLoadTimestamp.current = Date.now();
            const alertShownForThisSlide = handleTeacherAlertDisplay(currentSlideData);

            const isVideo = currentSlideData.type === 'video' ||
                (currentSlideData.type === 'interactive_invest' && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
                ((currentSlideData.type === 'consequence_reveal' || currentSlideData.type === 'payoff_reveal') && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i));

            if (isVideo) {
                setCurrentVideoDurationState(null);
                const timeSinceLastToggle = Date.now() - lastManualToggleTimestamp.current;

                let shouldPlayNow = false; // Default to false

                // Only auto-play if there's no alert and it's configured to auto-advance
                if (!alertShownForThisSlide && timeSinceLastToggle > 500) {
                    if (currentSlideData.id === 8 && currentSlideData.type === 'interactive_invest') {
                        shouldPlayNow = true;
                    } else if (currentSlideData.auto_advance_after_video) {
                        shouldPlayNow = true;
                    } else {
                        // Keep current state for non-auto-advance videos
                        shouldPlayNow = isPlayingVideoState;
                    }
                } else if (alertShownForThisSlide) {
                    shouldPlayNow = false;
                }

                // Only update if state actually needs to change
                if (isPlayingVideoState !== shouldPlayNow) {
                    setIsPlayingVideoState(shouldPlayNow);
                    if (dbSession && dbSession.is_playing !== shouldPlayNow) {
                        updateSessionInDb({ is_playing: shouldPlayNow });
                    }
                }
            } else {
                if (isPlayingVideoState) {
                    setIsPlayingVideoState(false);
                    if (dbSession && dbSession.is_playing) {
                        updateSessionInDb({ is_playing: false });
                    }
                }
            }
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
        } else {
            if (isPlayingVideoState) setIsPlayingVideoState(false);
            if (currentTeacherAlertState) setCurrentTeacherAlertState(null);
        }
    }, [currentSlideData, dbSession, updateSessionInDb, handleTeacherAlertDisplay, isPlayingVideoState]);

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

        setCurrentPhaseIdState(nextPhaseId);
        setCurrentSlideIdInPhaseState(nextSlideIndexInPhase);
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

    }, [currentPhaseNode, currentSlideIdInPhaseState, dbSession, gameStructure, allPhasesInOrder, updateSessionInDb, processChoicePhaseDecisionsFunction, currentPhaseIdState, currentSlideData]);

    const handleAutoAdvanceAfterVideoEnded = useCallback(async () => {
        console.log(`[GameController] handleAutoAdvanceAfterVideoEnded called. Slide: ${currentSlideData?.id}, auto_advance: ${currentSlideData?.auto_advance_after_video}`);

        if (isPlayingVideoState) {
            setIsPlayingVideoState(false);
            if (dbSession && dbSession.is_playing) {
                await updateSessionInDb({ is_playing: false });
            }
        }

        // Special handling for Slide 5
        if (currentSlideData?.id === 5) {
            console.log("[GameController] Slide 5 ended, showing custom alert");
            setCurrentTeacherAlertState({
                title: "Begin RD-1 Investments",
                message: "Time's Up. When you're ready, click Next to proceed."
            });
            return;
        }

        // Regular auto-advance for other slides (including Slide 4)
        if (currentSlideData?.auto_advance_after_video && !currentTeacherAlertState) {
            console.log(`[GameController] Auto-advancing from slide ${currentSlideData.id}`);
            await advanceToNextSlideInternal();
        } else {
            console.log("[GameController] Not auto-advancing. Conditions not met.");
            if (currentSlideData?.id === 8 && currentSlideData.type === 'interactive_invest' && currentSlideData.teacher_alert && !currentTeacherAlertState) {
                handleTeacherAlertDisplay(currentSlideData);
            }
        }
    }, [currentSlideData, advanceToNextSlideInternal, isPlayingVideoState, dbSession, updateSessionInDb, currentTeacherAlertState, handleTeacherAlertDisplay]);

    useEffect(() => {
        if (currentSlideData?.id === 8 && currentSlideData.type === 'interactive_invest' && allTeamsSubmittedCurrentInteractivePhaseState) {
            if (!currentTeacherAlertState) {
                handleTeacherAlertDisplay(currentSlideData);
            }
        }
    }, [allTeamsSubmittedCurrentInteractivePhaseState, currentSlideData, handleTeacherAlertDisplay, currentTeacherAlertState]);

    const nextSlide = useCallback(async () => {
        if (currentTeacherAlertState) return;

        // Special handling for Slide 5
        if (currentSlideData?.id === 5) {
            // Show the custom alert
            setCurrentTeacherAlertState({
                title: "Begin RD-1 Investments",
                message: "Time's Up. When you're ready, click Next to proceed."
            });
            return;
        }

        if (currentSlideData?.id === 8 && currentSlideData.type === 'interactive_invest') {
            if (!allTeamsSubmittedCurrentInteractivePhaseState) {
                const confirmAdvance = window.confirm("Not all teams have submitted their RD-1 investments. The 15-minute timer might still be running. End the investment period early and proceed?");
                if (!confirmAdvance) return;
            }
            if (currentSlideData.teacher_alert && !currentTeacherAlertState) {
                handleTeacherAlertDisplay(currentSlideData);
                return;
            }
            if (!currentSlideData.teacher_alert) {
                await advanceToNextSlideInternal();
                return;
            }
        } else if (currentSlideData?.teacher_alert) {
            if (handleTeacherAlertDisplay(currentSlideData)) {
                return;
            }
        }
        await advanceToNextSlideInternal();
    }, [currentTeacherAlertState, currentSlideData, advanceToNextSlideInternal, allTeamsSubmittedCurrentInteractivePhaseState, handleTeacherAlertDisplay]);

    const clearTeacherAlert = useCallback(async () => {
        setCurrentTeacherAlertState(null);
        await advanceToNextSlideInternal();
    }, [advanceToNextSlideInternal]);

    const selectPhase = useCallback(async (phaseId: string) => {
        const targetPhase = allPhasesInOrder.find(p => p.id === phaseId);
        if (targetPhase && dbSession && gameStructure?.slides) {
            setCurrentPhaseIdState(phaseId);
            setCurrentSlideIdInPhaseState(0);
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
    }, [allPhasesInOrder, dbSession, updateSessionInDb, teacherNotesState, gameStructure?.slides]);

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

            setCurrentPhaseIdState(newPhaseId);
            setCurrentSlideIdInPhaseState(newSlideIndex);
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
    }, [currentTeacherAlertState, currentPhaseNode, currentSlideIdInPhaseState, dbSession, allPhasesInOrder, updateSessionInDb, currentPhaseIdState, gameStructure?.slides]);

    const togglePlayPauseVideo = useCallback(async () => {
        if (currentTeacherAlertState) {
            await clearTeacherAlert();
            return;
        }
        if ((currentSlideData?.type === 'video' ||
                (currentSlideData?.type === 'interactive_invest' && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i)))
            && dbSession) {
            const newIsPlaying = !isPlayingVideoState;
            lastManualToggleTimestamp.current = Date.now();
            setIsPlayingVideoState(newIsPlaying);
            setTriggerVideoSeekState(false);
            await updateSessionInDb({is_playing: newIsPlaying});
        }
    }, [currentSlideData, dbSession, isPlayingVideoState, updateSessionInDb, currentTeacherAlertState, clearTeacherAlert]);

    const setVideoPlaybackState = useCallback(async (playingFromPreview: boolean, timeFromPreview: number, seekTriggeredByPreview: boolean = false) => {
        if (!dbSession) return;

        // If we're in the middle of a seek operation, ignore play/pause state changes
        if (justSeekedRef.current && !seekTriggeredByPreview) {
            // Only update the time, not the play state
            setVideoCurrentTimeState(timeFromPreview);
            return;
        }

        let newGlobalIsPlayingTarget = playingFromPreview;
        let newGlobalTriggerSeek = false;
        let shouldUpdateDbPlayState = false;

        if (seekTriggeredByPreview) {
            // During seek, maintain current playing state instead of forcing pause
            newGlobalIsPlayingTarget = isPlayingVideoState; // Keep current state
            newGlobalTriggerSeek = true;
            justSeekedRef.current = true;
            setTimeout(() => { justSeekedRef.current = false; }, 500);
            // Don't update DB play state during seek
            shouldUpdateDbPlayState = false;
        } else {
            // Regular play/pause
            newGlobalIsPlayingTarget = playingFromPreview;
            newGlobalTriggerSeek = false;
            if (isPlayingVideoState !== newGlobalIsPlayingTarget) {
                shouldUpdateDbPlayState = true;
                lastManualToggleTimestamp.current = Date.now();
            }
        }

        // Update local states
        if (!seekTriggeredByPreview) {
            setIsPlayingVideoState(newGlobalIsPlayingTarget);
        }
        setVideoCurrentTimeState(timeFromPreview);

        if (newGlobalTriggerSeek) {
            setTriggerVideoSeekState(true);
            requestAnimationFrame(() => setTriggerVideoSeekState(false));
        } else {
            setTriggerVideoSeekState(false);
        }

        // Only update DB if needed and not during seek
        if (shouldUpdateDbPlayState) {
            await updateSessionInDb({ is_playing: newGlobalIsPlayingTarget });
        }
    }, [dbSession, updateSessionInDb, isPlayingVideoState]);

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
        togglePlayPauseVideo,
        setVideoPlaybackState,
        updateTeacherNotesForCurrentSlide,
        clearTeacherAlert,
        currentVideoDuration: currentVideoDurationState,
        reportVideoDuration,
        handlePreviewVideoEnded: handleAutoAdvanceAfterVideoEnded,
        setCurrentTeacherAlertState,
    };
};