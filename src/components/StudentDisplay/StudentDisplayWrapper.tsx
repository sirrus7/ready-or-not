// src/components/StudentDisplay/StudentDisplayWrapper.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import StudentDisplayView from './StudentDisplayView';
import { Slide, TeacherBroadcastPayload } from '../../types';
import { readyOrNotGame_2_0_DD } from '../../data/gameStructure';
import { Hourglass } from 'lucide-react';

const StudentDisplayWrapper: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isPlayingTargetState, setIsPlayingTargetState] = useState<boolean>(false);
    const [videoTimeTargetState, setVideoTimeTargetState] = useState<number | undefined>(undefined);
    const [triggerSeekEventState, setTriggerSeekEventState] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>("Initializing Student Display...");
    const [isConnected, setIsConnected] = useState<boolean>(false);

    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD, []);

    useEffect(() => {
        document.title = `Student Display - Session ${sessionId || 'N/A'}`;
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) {
            setStatusMessage("Error: No Session ID provided in URL.");
            return;
        }

        console.log(`[StudentDisplayWrapper] Setting up BroadcastChannel for session: ${sessionId}`);
        setStatusMessage(`Connecting to game session: ${sessionId}...`);

        const channelName = `classroom-${sessionId}`;
        const channel = new BroadcastChannel(channelName);

        // Set up message listener
        channel.onmessage = (event) => {
            console.log(`[StudentDisplayWrapper] Received message:`, event.data);

            if (event.data.type === 'TEACHER_STATE_UPDATE') {
                const payload = event.data.payload as TeacherBroadcastPayload;
                console.log(`[StudentDisplayWrapper] Processing teacher state update:`, payload);

                const slideData = payload.currentSlideId !== null
                    ? gameStructureInstance.slides.find(s => s.id === payload.currentSlideId) || null
                    : null;

                setCurrentSlide(slideData);
                setIsPlayingTargetState(payload.isPlayingVideo);
                setVideoTimeTargetState(payload.videoCurrentTime);
                setTriggerSeekEventState(payload.triggerVideoSeek || false);

                if (payload.triggerVideoSeek) {
                    setTimeout(() => setTriggerSeekEventState(false), 100);
                }

                setStatusMessage("");
                setIsConnected(true);

            } else if (event.data.type === 'SESSION_ENDED_BY_TEACHER') {
                setCurrentSlide(null);
                setIsPlayingTargetState(false);
                setStatusMessage("The game session has ended. You can close this window.");
                setIsConnected(false);
                channel.close();
            }
        };

        // Announce that student display is ready
        console.log(`[StudentDisplayWrapper] Announcing ready state`);
        channel.postMessage({
            type: 'STUDENT_DISPLAY_READY',
            payload: { sessionId }
        });

        setStatusMessage(`Waiting for game updates for session: ${sessionId}...`);

        // Request initial state after a short delay
        setTimeout(() => {
            console.log(`[StudentDisplayWrapper] Requesting initial state`);
            channel.postMessage({
                type: 'STUDENT_DISPLAY_REQUEST_STATE',
                payload: { sessionId }
            });
        }, 1000);

        return () => {
            console.log(`[StudentDisplayWrapper] Cleaning up BroadcastChannel`);
            channel.postMessage({
                type: 'STUDENT_DISPLAY_CLOSING',
                payload: { sessionId }
            });
            channel.close();
        };
    }, [sessionId, gameStructureInstance]);

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
                    <Hourglass size={48} className={`mb-4 text-blue-400 ${isConnected ? '' : 'animate-pulse'}`}/>
                    <p className="text-xl">{statusMessage}</p>
                    <div className="mt-4 text-sm text-gray-400 space-y-1">
                        <p>Session ID: {sessionId}</p>
                        <p>Status: {isConnected ? 'Connected' : 'Waiting for teacher...'}</p>
                        {!isConnected && (
                            <p className="text-yellow-400 mt-2">
                                Make sure the teacher has started the game session
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDisplayWrapper;