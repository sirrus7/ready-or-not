// src/hooks/useGameController.tsx
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
    const lastManualToggleTimestamp = useRef(0); // NEW: Timestamp for last explicit play/pause

    const allPhasesInOrder = useMemo((): GamePhaseNode[] => {
        if (!gameStructure?.allPhases) return [];
        return gameStructure.allPhases;
    }, [gameStructure]);

    useEffect(() => {
        if (dbSession) {
            setCurrentPhaseIdState(dbSession.current_phase_id);
            setCurrentSlideIdInPhaseState(dbSession.current_slide_id_in_phase ?? 0);
            setTeacherNotesState(dbSession.teacher_notes || {});
            // Initialize isPlayingVideoState from dbSession. This might be immediately
            // overridden by the currentSlideData effect if the slide type dictates it.
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
        if (currentPhaseNode.slide_ids.length === 0 && currentPhaseNode.slide_ids[0] === undefined) return null;
        if (currentSlideIdInPhaseState < 0 || currentSlideIdInPhaseState >= currentPhaseNode.slide_ids.length) {
            return null;
        }
        const slideId = currentPhaseNode.slide_ids[currentSlideIdInPhaseState];
        return gameStructure.slides.find(s => s.id === slideId) || null;
    }, [currentPhaseNode, currentSlideIdInPhaseState, gameStructure?.slides]);

    const handleTeacherAlertDisplay = useCallback((slide: Slide | null): boolean => {
        if (!slide || !slide.teacher_alert) return false;
        if (currentTeacherAlertState?.title === slide.teacher_alert.title && currentTeacherAlertState?.message === slide.teacher_alert.message) {
            return true;
        }
        setCurrentTeacherAlertState(slide.teacher_alert);
        if (isPlayingVideoState) { // If an alert pops up, ensure video is paused
            setIsPlayingVideoState(false);
            if (dbSession && dbSession.is_playing) updateSessionInDb({is_playing: false});
        }
        return true;
    }, [dbSession, updateSessionInDb, isPlayingVideoState, currentTeacherAlertState]);

    // Effect to manage video playback and alerts when currentSlideData changes
    useEffect(() => {
        if (currentSlideData) {
            // If an alert was triggered by a previous slide and we are now on a new slide without its own alert, clear the old one.
            if (!currentSlideData.teacher_alert && currentTeacherAlertState) {
                setCurrentTeacherAlertState(null);
            }
            // Then, attempt to display an alert for the NEW current slide
            const alertShown = handleTeacherAlertDisplay(currentSlideData);

            const isVideo = currentSlideData.type === 'video' ||
                (currentSlideData.type === 'interactive_invest' && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i)) ||
                ((currentSlideData.type === 'consequence_reveal' || currentSlideData.type === 'payoff_reveal') && currentSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i));

            if (isVideo) {
                setCurrentVideoDurationState(null);
                // Only auto-play if no alert was just shown for this slide.
                // And if the last explicit toggle wasn't very recent (to avoid overriding it).
                const timeSinceLastToggle = Date.now() - lastManualToggleTimestamp.current;
                if (!alertShown && timeSinceLastToggle > 500) { // 500ms grace period for manual toggle
                    const shouldAutoplay = !!currentSlideData.auto_advance_after_video; // Simplified: only auto_advance slides truly autoplay on load
                    if (isPlayingVideoState !== shouldAutoplay) {
                        setIsPlayingVideoState(shouldAutoplay);
                        if (dbSession && dbSession.is_playing !== shouldAutoplay) {
                            updateSessionInDb({is_playing: shouldAutoplay});
                        }
                    }
                } else if (alertShown && isPlayingVideoState) { // If alert was shown, ensure video is paused
                    setIsPlayingVideoState(false);
                    if (dbSession && dbSession.is_playing) updateSessionInDb({is_playing: false});
                }

            } else { // Not a video slide
                if (isPlayingVideoState) {
                    setIsPlayingVideoState(false);
                    if (dbSession && dbSession.is_playing) {
                        updateSessionInDb({is_playing: false});
                    }
                }
            }
            setAllTeamsSubmittedCurrentInteractivePhaseState(false);
        } else {
            if (isPlayingVideoState) {
                setIsPlayingVideoState(false);
                if (dbSession && dbSession.is_playing) {
                    updateSessionInDb({is_playing: false});
                }
            }
            if (currentTeacherAlertState) setCurrentTeacherAlertState(null); // Clear alert if no slide
        }
    }, [currentSlideData, dbSession, updateSessionInDb, handleTeacherAlertDisplay]); // Removed isPlayingVideoState & currentTeacherAlertState to break potential loops


    const reportVideoDuration = useCallback((duration: number) => {
        setCurrentVideoDurationState(duration);
    }, []);

    const advanceToNextSlideInternal = useCallback(async (forceIsPlaying?: boolean) => { // Added optional forceIsPlaying
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

        // isPlayingVideoState will be set by the useEffect watching currentSlideData
        // Forcing a play state is now only done by togglePlayPauseVideo or initial slide load effect

        setVideoCurrentTimeState(0);
        setTriggerVideoSeekState(true);
        setAllTeamsSubmittedCurrentInteractivePhaseState(false);
        setCurrentVideoDurationState(null);

        // Determine the play state for the DB based on the *new* slide's properties
        let newSlidePlayState = false;
        const targetPhaseForNextSlide = allPhasesInOrder.find(p => p.id === nextPhaseId);
        if (targetPhaseForNextSlide && gameStructure?.slides && nextSlideIndexInPhase < targetPhaseForNextSlide.slide_ids.length) {
            const upcomingSlideId = targetPhaseForNextSlide.slide_ids[nextSlideIndexInPhase];
            const upcomingSlideData = gameStructure.slides.find(s => s.id === upcomingSlideId);
            if (upcomingSlideData && (upcomingSlideData.type === 'video' || (upcomingSlideData.type === 'interactive_invest' && !!upcomingSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i)))) {
                if (!upcomingSlideData.teacher_alert && upcomingSlideData.auto_advance_after_video) { // More specific condition for auto-play
                    newSlidePlayState = true;
                } else if (!upcomingSlideData.teacher_alert && upcomingSlideData.type === 'interactive_invest' && upcomingSlideData.id === 8) { // Slide 8 should play
                    newSlidePlayState = true;
                }
            }
        }

        await updateSessionInDb({
            current_phase_id: nextPhaseId,
            current_slide_id_in_phase: nextSlideIndexInPhase,
            is_playing: forceIsPlaying !== undefined ? forceIsPlaying : newSlidePlayState // Allow override
        });
        requestAnimationFrame(() => setTriggerVideoSeekState(false));

    }, [currentPhaseNode, currentSlideIdInPhaseState, dbSession, gameStructure, allPhasesInOrder, updateSessionInDb, processChoicePhaseDecisionsFunction, currentPhaseIdState, currentSlideData]);

    useEffect(() => {
        if (currentSlideData?.id === 8 && currentSlideData.type === 'interactive_invest' && allTeamsSubmittedCurrentInteractivePhaseState) {
            if (!currentTeacherAlertState) {
                handleTeacherAlertDisplay(currentSlideData);
            }
        }
    }, [allTeamsSubmittedCurrentInteractivePhaseState, currentSlideData, handleTeacherAlertDisplay, currentTeacherAlertState]);


    const nextSlide = useCallback(async () => {
        if (currentTeacherAlertState) return;

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
            const firstSlideIdOfTargetPhase = targetPhase.slide_ids[0];
            const firstSlideDataOfTargetPhase = gameStructure.slides.find(s => s.id === firstSlideIdOfTargetPhase);
            let newSlideIsVideoAndShouldPlay = false;
            if (firstSlideDataOfTargetPhase && (firstSlideDataOfTargetPhase.type === 'video' ||
                (firstSlideDataOfTargetPhase.type === 'interactive_invest' && !!firstSlideDataOfTargetPhase.source_url?.match(/\.(mp4|webm|ogg)$/i)))) {
                if (!firstSlideDataOfTargetPhase.teacher_alert && (firstSlideDataOfTargetPhase.auto_advance_after_video || firstSlideDataOfTargetPhase.id === 8)) {
                    newSlideIsVideoAndShouldPlay = true;
                }
            }

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
                is_playing: newSlideIsVideoAndShouldPlay,
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
            let newSlideIsVideoAndShouldPlay = false;

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

            const targetPhaseNode = allPhasesInOrder.find(p => p.id === newPhaseId);
            if (targetPhaseNode && newSlideIndex >= 0 && newSlideIndex < targetPhaseNode.slide_ids.length) {
                const targetSlideId = targetPhaseNode.slide_ids[newSlideIndex];
                const targetSlideData = gameStructure.slides.find(s => s.id === targetSlideId);
                if (targetSlideData && (targetSlideData.type === 'video' || (targetSlideData.type === 'interactive_invest' && !!targetSlideData.source_url?.match(/\.(mp4|webm|ogg)$/i)))) {
                    if (!targetSlideData.teacher_alert && (targetSlideData.auto_advance_after_video || targetSlideData.id === 8)) {
                        newSlideIsVideoAndShouldPlay = true;
                    }
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
                is_playing: newSlideIsVideoAndShouldPlay
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
            lastManualToggleTimestamp.current = Date.now(); // Record manual toggle
            setIsPlayingVideoState(newIsPlaying);
            setTriggerVideoSeekState(false);
            await updateSessionInDb({is_playing: newIsPlaying});
        }
    }, [currentSlideData, dbSession, isPlayingVideoState, updateSessionInDb, currentTeacherAlertState, clearTeacherAlert]);

    const setVideoPlaybackState = useCallback(async (playingFromPreview: boolean, timeFromPreview: number, seekTriggeredByPreview: boolean = false) => {
        if (!dbSession) return;

        if (justSeekedRef.current && !seekTriggeredByPreview && playingFromPreview !== isPlayingVideoState) {
            return;
        }

        let newGlobalIsPlayingTarget = playingFromPreview;
        let newGlobalTriggerSeek = false;

        if (seekTriggeredByPreview) {
            newGlobalIsPlayingTarget = false;
            newGlobalTriggerSeek = true;
            justSeekedRef.current = true;
            setTimeout(() => {
                justSeekedRef.current = false;
            }, 500);
        } else {
            // If it's a play/pause from preview, reflect that intended state
            newGlobalIsPlayingTarget = playingFromPreview;
            newGlobalTriggerSeek = false;
            // Record this as a "manual" toggle from the preview controls
            lastManualToggleTimestamp.current = Date.now();
        }

        setIsPlayingVideoState(newGlobalIsPlayingTarget);
        setVideoCurrentTimeState(timeFromPreview);

        if (newGlobalTriggerSeek) {
            setTriggerVideoSeekState(true);
            requestAnimationFrame(() => setTriggerVideoSeekState(false));
        } else {
            setTriggerVideoSeekState(false);
        }

        if (dbSession.is_playing !== newGlobalIsPlayingTarget || newGlobalTriggerSeek) {
            await updateSessionInDb({is_playing: newGlobalIsPlayingTarget});
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

    const handleAutoAdvanceAfterVideoEnded = useCallback(async () => {
        if (currentSlideData?.auto_advance_after_video && !currentTeacherAlertState) {
            if (isPlayingVideoState) { // Ensure video is marked as not playing
                setIsPlayingVideoState(false);
                if (dbSession && dbSession.is_playing) {
                    await updateSessionInDb({is_playing: false});
                }
            }
            await advanceToNextSlideInternal();
        } else {
            if (isPlayingVideoState) { // If not auto-advancing, still ensure it's marked as paused
                setIsPlayingVideoState(false);
                if (dbSession && dbSession.is_playing) {
                    await updateSessionInDb({is_playing: false});
                }
            }
        }
    }, [currentSlideData, advanceToNextSlideInternal, isPlayingVideoState, dbSession, updateSessionInDb, currentTeacherAlertState]);

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
        handlePreviewVideoEnded: handleAutoAdvanceAfterVideoEnded,
    };
};