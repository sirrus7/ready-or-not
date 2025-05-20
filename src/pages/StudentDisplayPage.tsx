// src/pages/StudentDisplayPage.tsx
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom'; // Import useParams
import SlideRenderer from '../components/StudentDisplay/SlideRenderer';
import { Slide, TeacherBroadcastPayload } from '../types';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure'; // Assuming access to this for slide data
import {Hourglass} from 'lucide-react';

const StudentDisplayPage: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>(); // Get sessionId from URL
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    // Optional: State to show a "connecting" or "waiting for session" message
    const [statusMessage, setStatusMessage] = useState<string>("Initializing Student Display...");

    useEffect(() => {
        document.title = `Student Display - Session ${sessionId || 'N/A'}`;
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) {
            setStatusMessage("Error: No Session ID provided in URL. This window should be opened by the teacher.");
            return;
        }

        setStatusMessage(`Connecting to game session: ${sessionId}...`);
        console.log(`StudentDisplayPage: Attempting to connect to BroadcastChannel: classroom-${sessionId}`);

        const channel = new BroadcastChannel(`classroom-${sessionId}`);

        channel.onmessage = (event) => {
            console.log('StudentDisplayPage: Message received from teacher', event.data);
            if (event.data.type === 'TEACHER_STATE_UPDATE') {
                const payload = event.data.payload as TeacherBroadcastPayload;

                const gameSlides = readyOrNotGame_2_0_DD.slides; // Accessing master slides
                const slideData = gameSlides.find(s => s.id === payload.currentSlideId) || null;

                setCurrentSlide(slideData);
                setIsPlaying(payload.isPlaying);
                setStatusMessage(""); // Clear status message once connected and receiving data
            } else if (event.data.type === 'SESSION_ENDED_BY_TEACHER') { // Example of another message type
                setCurrentSlide(null);
                setIsPlaying(false);
                setStatusMessage("The game session has ended. You can close this window.");
                channel.close(); // Close the channel as it's no longer needed
            }
        };

        // Inform teacher app that student display is ready and listening
        // This helps the teacher app know it can start sending updates
        channel.postMessage({type: 'STUDENT_DISPLAY_READY', payload: {sessionId}});
        console.log(`StudentDisplayPage: Sent STUDENT_DISPLAY_READY for session ${sessionId}`);
        setStatusMessage(`Waiting for game updates from facilitator for session: ${sessionId}...`);


        return () => {
            console.log(`StudentDisplayPage: Closing BroadcastChannel: classroom-${sessionId}`);
            channel.postMessage({type: 'STUDENT_DISPLAY_CLOSING', payload: {sessionId}}); // Inform teacher
            channel.close();
        };
    }, [sessionId]); // Re-run if sessionId changes (though it shouldn't for a given window instance)

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-900"> {/* Default bg if slide has none */}
            {currentSlide ? (
                <SlideRenderer slide={currentSlide} isPlaying={isPlaying} isStudentView={false}/>
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