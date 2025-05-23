// src/pages/StudentDisplayPage.tsx
import React, {useEffect, useState, useMemo} from 'react';
import { useParams } from 'react-router-dom';
import StudentDisplayView from '../components/StudentDisplay/StudentDisplayView';
import {Slide, TeacherBroadcastPayload} from '../types';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure'; // For slide definitions
import {Hourglass} from 'lucide-react';

interface StudentDisplayPageProps {
    sessionId?: string;
}

const StudentDisplayPage: React.FC<StudentDisplayPageProps> = ({ sessionId: propSessionId }) => {
    // Get sessionId from URL params first, then fall back to props
    const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
    const sessionId = paramSessionId || propSessionId;

    console.log('[StudentDisplayPage] Component loaded with:', {
        paramSessionId,
        propSessionId,
        finalSessionId: sessionId,
        pathname: window.location.pathname,
        fullUrl: window.location.href
    });

    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isPlayingTargetState, setIsPlayingTargetState] = useState<boolean>(false);
    const [videoTimeTargetState, setVideoTimeTargetState] = useState<number | undefined>(undefined);
    const [triggerSeekEventState, setTriggerSeekEventState] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>("Initializing Student Display...");

    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD, []);

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
                params: paramSessionId,
                props: propSessionId
            });
            setStatusMessage(errorMsg);
            return;
        }

        setStatusMessage(`Connecting to game session: ${sessionId}...`);
        const channelName = `classroom-${sessionId}`;
        console.log('[StudentDisplayPage] Creating BroadcastChannel:', channelName);

        const channel = new BroadcastChannel(channelName);

        channel.onmessage = (event) => {
            console.log('[StudentDisplayPage] Received broadcast message:', event.data);

            if (event.data.type === 'TEACHER_STATE_UPDATE') {
                const payload = event.data.payload as TeacherBroadcastPayload;
                const slideData = gameStructureInstance.slides.find(s => s.id === payload.currentSlideId) || null;

                console.log('[StudentDisplayPage] Processing teacher state update:', {
                    slideId: payload.currentSlideId,
                    slideFound: !!slideData,
                    isPlaying: payload.isPlayingVideo
                });

                setCurrentSlide(slideData);
                setIsPlayingTargetState(payload.isPlayingVideo);
                setVideoTimeTargetState(payload.videoCurrentTime);
                setTriggerSeekEventState(payload.triggerVideoSeek || false);
                if (payload.triggerVideoSeek) {
                    setTimeout(() => setTriggerSeekEventState(false), 100);
                }
                setStatusMessage("");
            } else if (event.data.type === 'SESSION_ENDED_BY_TEACHER') {
                console.log('[StudentDisplayPage] Session ended by teacher');
                setCurrentSlide(null);
                setIsPlayingTargetState(false);
                setStatusMessage("The game session has ended. You can close this window.");
                channel.close();
            }
        };

        // Notify that student display is ready
        console.log('[StudentDisplayPage] Posting STUDENT_DISPLAY_READY message');
        channel.postMessage({type: 'STUDENT_DISPLAY_READY', payload: {sessionId}});
        setStatusMessage(`Waiting for game updates for session: ${sessionId}...`);

        return () => {
            console.log('[StudentDisplayPage] Cleanup: posting STUDENT_DISPLAY_CLOSING and closing channel');
            channel.postMessage({type: 'STUDENT_DISPLAY_CLOSING', payload: {sessionId}});
            channel.close();
        };
    }, [sessionId, gameStructureInstance]);

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
                </div>
            )}
        </div>
    );
};

export default StudentDisplayPage;