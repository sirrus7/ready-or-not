// src/pages/StudentDisplayPage.tsx
import React, {useEffect, useState, useMemo, useRef} from 'react';
import { useParams } from 'react-router-dom';
import StudentDisplayView from '../components/StudentDisplay/StudentDisplayView';
import {Slide, TeacherBroadcastPayload} from '../types';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure'; // For slide definitions
import {Hourglass} from 'lucide-react';

const StudentDisplayPage: React.FC = () => {
    // Get sessionId from URL params
    const { sessionId } = useParams<{ sessionId: string }>();

    console.log('[StudentDisplayPage] Component loaded with:', {
        sessionId,
        pathname: window.location.pathname,
        fullUrl: window.location.href
    });

    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isPlayingTargetState, setIsPlayingTargetState] = useState<boolean>(false);
    const [videoTimeTargetState, setVideoTimeTargetState] = useState<number | undefined>(undefined);
    const [triggerSeekEventState, setTriggerSeekEventState] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>("Initializing Student Display...");

    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD, []);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const lastProcessedPayloadRef = useRef<string>('');

    useEffect(() => {
        document.title = `Student Display - Session ${sessionId || 'N/A'}`;
        console.log('[StudentDisplayPage] Document title set, sessionId:', sessionId);
    }, [sessionId]);

    useEffect(() => {
        console.log('[StudentDisplayPage] Main effect running with sessionId:', sessionId);

        if (!sessionId) {
            const errorMsg = "Error: No Session ID provided in URL.";
            console.error('[StudentDisplayPage]', errorMsg);
            console.error('[StudentDisplayPage] URL analysis:', {
                pathname: window.location.pathname,
                href: window.location.href,
                extractedSessionId: sessionId
            });
            setStatusMessage(errorMsg);
            return;
        }

        setStatusMessage(`Connecting to game session: ${sessionId}...`);
        const channelName = `classroom-${sessionId}`;
        console.log('[StudentDisplayPage] Creating BroadcastChannel:', channelName);

        // Clean up any existing channel
        if (channelRef.current) {
            channelRef.current.close();
        }

        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        channel.onmessage = (event) => {
            console.log('[StudentDisplayPage] Received broadcast message:', event.data);

            // Create a unique identifier for this payload to prevent duplicate processing
            const payloadId = JSON.stringify({
                type: event.data.type,
                slideId: event.data.payload?.currentSlideId,
                isPlaying: event.data.payload?.isPlayingVideo,
                videoTime: event.data.payload?.videoCurrentTime,
                triggerSeek: event.data.payload?.triggerVideoSeek,
                timestamp: Math.floor((event.data.payload?.videoCurrentTime || 0) * 10) // Round to 100ms precision
            });

            // Skip if we just processed this exact payload (prevents rapid duplicate updates)
            if (payloadId === lastProcessedPayloadRef.current) {
                console.log('[StudentDisplayPage] Skipping duplicate payload');
                return;
            }
            lastProcessedPayloadRef.current = payloadId;

            if (event.data.type === 'TEACHER_STATE_UPDATE') {
                const payload = event.data.payload as TeacherBroadcastPayload;
                const slideData = gameStructureInstance.slides.find(s => s.id === payload.currentSlideId) || null;

                console.log('[StudentDisplayPage] Processing teacher state update:', {
                    slideId: payload.currentSlideId,
                    slideFound: !!slideData,
                    slideTitle: slideData?.title,
                    isPlaying: payload.isPlayingVideo,
                    videoTime: payload.videoCurrentTime,
                    triggerSeek: payload.triggerVideoSeek
                });

                // Update slide first
                if (slideData?.id !== currentSlide?.id) {
                    console.log('[StudentDisplayPage] Slide changed:', currentSlide?.id, '->', slideData?.id);
                    setCurrentSlide(slideData);
                }

                // Update video states
                setIsPlayingTargetState(payload.isPlayingVideo);

                if (payload.videoCurrentTime !== undefined) {
                    setVideoTimeTargetState(payload.videoCurrentTime);
                }

                if (payload.triggerVideoSeek) {
                    console.log('[StudentDisplayPage] Triggering seek to:', payload.videoCurrentTime);
                    setTriggerSeekEventState(true);
                    // Clear the seek trigger after a short delay
                    setTimeout(() => {
                        setTriggerSeekEventState(false);
                    }, 100);
                } else {
                    setTriggerSeekEventState(false);
                }

                setStatusMessage("");
            } else if (event.data.type === 'SESSION_ENDED_BY_TEACHER') {
                console.log('[StudentDisplayPage] Session ended by teacher');
                setCurrentSlide(null);
                setIsPlayingTargetState(false);
                setStatusMessage("The game session has ended. You can close this window.");
                if (channelRef.current) {
                    channelRef.current.close();
                    channelRef.current = null;
                }
            }
        };

        channel.onmessageerror = (error) => {
            console.error('[StudentDisplayPage] BroadcastChannel error:', error);
            setStatusMessage("Connection error. Please refresh the page.");
        };

        // Notify that student display is ready and request current state
        console.log('[StudentDisplayPage] Posting STUDENT_DISPLAY_READY message');
        channel.postMessage({type: 'STUDENT_DISPLAY_READY', payload: {sessionId}});

        // Also request current state explicitly
        setTimeout(() => {
            console.log('[StudentDisplayPage] Requesting current state');
            channel.postMessage({type: 'STUDENT_DISPLAY_REQUEST_STATE', payload: {sessionId}});
        }, 500);

        setStatusMessage(`Connected to session: ${sessionId}. Waiting for content...`);

        return () => {
            console.log('[StudentDisplayPage] Cleanup: posting STUDENT_DISPLAY_CLOSING and closing channel');
            if (channelRef.current) {
                channelRef.current.postMessage({type: 'STUDENT_DISPLAY_CLOSING', payload: {sessionId}});
                channelRef.current.close();
                channelRef.current = null;
            }
        };
    }, [sessionId, gameStructureInstance, currentSlide?.id]);

    if (!sessionId) {
        return (
            <div className="h-screen w-screen overflow-hidden bg-red-900 text-white">
                <div className="h-full flex flex-col items-center justify-center p-8">
                    <Hourglass size={48} className="mb-4 text-red-400"/>
                    <p className="text-xl text-center">Error: No Session ID provided in URL</p>
                    <p className="text-sm text-gray-300 mt-2">Current URL: {window.location.href}</p>
                    <p className="text-sm text-gray-300">Expected format: /student-display/[session-id]</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-900">
            {currentSlide ? (
                <StudentDisplayView
                    slide={currentSlide}
                    isPlayingTarget={isPlayingTargetState}
                    videoTimeTarget={videoTimeTargetState}
                    triggerSeekEvent={triggerSeekEventState}
                    isForTeacherPreview={false}
                />
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-white p-8">
                    <Hourglass size={48} className="mb-4 text-blue-400 animate-pulse"/>
                    <p className="text-xl">{statusMessage}</p>
                    <p className="text-sm text-gray-400 mt-2">Session ID: {sessionId}</p>
                    {sessionId && (
                        <p className="text-xs text-gray-500 mt-4">
                            If content doesn't appear, try refreshing both the teacher dashboard and this window.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentDisplayPage;