// src/pages/StudentDisplayPage.tsx
import React, {useEffect, useState, useMemo} from 'react';
import {useParams} from 'react-router-dom';
import StudentDisplayView from '../components/StudentDisplay/StudentDisplayView';
import {Slide, TeacherBroadcastPayload} from '../types';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure'; // For slide definitions
import {Hourglass} from 'lucide-react';

const StudentDisplayPage: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isPlayingTargetState, setIsPlayingTargetState] = useState<boolean>(false);
    const [videoTimeTargetState, setVideoTimeTargetState] = useState<number | undefined>(undefined);
    const [triggerSeekEventState, setTriggerSeekEventState] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>("Initializing Student Display...");

    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD, []);

    useEffect(() => {
        document.title = `Student Display - Session ${sessionId || 'N/A'}`;
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) {
            setStatusMessage("Error: No Session ID provided in URL.");
            return;
        }
        setStatusMessage(`Connecting to game session: ${sessionId}...`);
        const channel = new BroadcastChannel(`classroom-${sessionId}`);

        channel.onmessage = (event) => {
            if (event.data.type === 'TEACHER_STATE_UPDATE') {
                const payload = event.data.payload as TeacherBroadcastPayload;
                const slideData = gameStructureInstance.slides.find(s => s.id === payload.currentSlideId) || null;

                setCurrentSlide(slideData);
                setIsPlayingTargetState(payload.isPlayingVideo);
                setVideoTimeTargetState(payload.videoCurrentTime);
                setTriggerSeekEventState(payload.triggerVideoSeek || false);
                if (payload.triggerVideoSeek) {
                    setTimeout(() => setTriggerSeekEventState(false), 100);
                }
                setStatusMessage("");
            } else if (event.data.type === 'SESSION_ENDED_BY_TEACHER') {
                setCurrentSlide(null);
                setIsPlayingTargetState(false);
                setStatusMessage("The game session has ended. You can close this window.");
                channel.close();
            }
        };
        channel.postMessage({type: 'STUDENT_DISPLAY_READY', payload: {sessionId}});
        setStatusMessage(`Waiting for game updates for session: ${sessionId}...`);
        return () => {
            channel.postMessage({type: 'STUDENT_DISPLAY_CLOSING', payload: {sessionId}});
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
                    <Hourglass size={48} className="mb-4 text-blue-400 animate-pulse"/>
                    <p className="text-xl">{statusMessage}</p>
                </div>
            )}
        </div>
    );
};
export default StudentDisplayPage;