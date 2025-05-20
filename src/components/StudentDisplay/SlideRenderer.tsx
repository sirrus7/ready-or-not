// src/components/StudentDisplay/SlideRenderer.tsx
import React, {useEffect, useRef} from 'react';
import {Slide} from '../../types';
import {
    Image as ImageIcon,
    Video as VideoIcon,
    FileText as TextIcon,
    AlertCircle,
    BarChart2,
    CheckSquare,
    Repeat as RepeatIcon,
    Hourglass, ListChecks
} from 'lucide-react';

interface SlideRendererProps {
    slide: Slide | null;
    isPlaying?: boolean; // Controlled by teacher for videos on main display
    isStudentView?: boolean; // True if this is rendering on an individual student's app
}

const SlideRenderer: React.FC<SlideRendererProps> = ({slide, isPlaying = false, isStudentView = false}) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && slide?.type === 'video') {
            if (isPlaying && !isStudentView) { // Autoplay only on main student display, controlled by teacher
                videoRef.current.play().catch(error => console.warn("Video autoplay prevented:", error));
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPlaying, slide, isStudentView]);

    if (!slide) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gray-800 text-white p-8">
                <Hourglass size={48} className="mb-4 text-blue-400 animate-pulse"/>
                <p className="text-xl">Waiting for content...</p>
            </div>
        );
    }

    const renderContent = () => {
        switch (slide.type) {
            case 'image':
                return (
                    <img
                        src={slide.source_url}
                        alt={slide.title || 'Slide Image'}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                );
            case 'video':
                return (
                    <video
                        ref={videoRef}
                        key={slide.source_url} // Key helps React re-render if source changes
                        src={slide.source_url}
                        controls={!isStudentView} // Show controls on main display, maybe not on student app's passive view
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg outline-none"
                        // autoPlay={isPlaying && !isStudentView} // Handled by useEffect for better control
                        // loop // Optional, based on game design
                        muted={isStudentView} // Mute on individual student views to avoid audio chaos
                        playsInline // Good for mobile
                    >
                        Your browser does not support the video tag.
                    </video>
                );
            case 'content_page':
                return (
                    <div className="text-center max-w-3xl mx-auto">
                        {slide.main_text &&
                            <h1 className="text-4xl md:text-5xl font-bold mb-6 break-words">{slide.main_text}</h1>}
                        {slide.sub_text &&
                            <p className="text-xl md:text-2xl text-gray-300 mb-8 break-words">{slide.sub_text}</p>}
                        {slide.bullet_points && slide.bullet_points.length > 0 && (
                            <ul className="list-disc list-inside text-left space-y-2 text-lg md:text-xl text-gray-200">
                                {slide.bullet_points.map((point, index) => (
                                    <li key={index}>{point}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                );
            case 'interactive_invest':
            case 'interactive_choice':
            case 'interactive_double_down_prompt':
            case 'interactive_double_down_select':
                // On the main Student Display, these slides show prompts/instructions
                // On the individual StudentGamePage, the DecisionPanel handles interaction
                return (
                    <div
                        className="text-center max-w-2xl mx-auto p-6 bg-gray-700/80 rounded-xl shadow-xl backdrop-blur-sm">
                        <ListChecks size={40} className="text-blue-400 mx-auto mb-4"/>
                        <h2 className="text-3xl font-bold mb-3">{slide.main_text || slide.title || "Make Your Decision"}</h2>
                        <p className="text-lg text-gray-300">{slide.sub_text || "Please use your team app to submit your response."}</p>
                        {slide.timer_duration_seconds && !isStudentView && ( // Show timer visual only on main display
                            <div
                                className="mt-6 text-2xl font-mono text-yellow-400 bg-black/30 px-4 py-2 rounded-lg inline-block">
                                {/* Timer display would be handled by AppContext updating this slide or a separate timer component */}
                                {`${Math.floor(slide.timer_duration_seconds / 60)}:${(slide.timer_duration_seconds % 60).toString().padStart(2, '0')}`}
                            </div>
                        )}
                    </div>
                );
            case 'consequence_reveal':
                return (
                    <div className="text-center max-w-3xl mx-auto">
                        {slide.source_url && slide.source_url.match(/\.(jpeg|jpg|gif|png)$/) != null &&
                            <img src={slide.source_url} alt={slide.title || 'Consequence Image'}
                                 className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg mb-4 mx-auto"/>
                        }
                        {slide.source_url && slide.source_url.match(/\.(mp4|webm|ogg)$/) != null &&
                            <video key={slide.source_url} src={slide.source_url} controls
                                   className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg mb-4 mx-auto outline-none"
                                   autoPlay muted={isStudentView} playsInline/>
                        }
                        {slide.main_text &&
                            <h2 className="text-2xl md:text-3xl font-semibold mb-2 break-words">{slide.main_text}</h2>}
                        {slide.sub_text && <p className="text-lg text-gray-300 break-words">{slide.sub_text}</p>}
                    </div>
                );
            case 'payoff_reveal':
                return (
                    <div className="text-center max-w-3xl mx-auto">
                        {/* This could be an image or video as well, or composed text */}
                        {slide.source_url && slide.source_url.match(/\.(jpeg|jpg|gif|png)$/) != null &&
                            <img src={slide.source_url} alt={slide.title || 'Payoff Image'}
                                 className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg mb-4 mx-auto"/>
                        }
                        {slide.source_url && slide.source_url.match(/\.(mp4|webm|ogg)$/) != null &&
                            <video key={slide.source_url} src={slide.source_url} controls
                                   className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg mb-4 mx-auto outline-none"
                                   autoPlay muted={isStudentView} playsInline/>
                        }
                        <h2 className="text-3xl font-bold mb-3">{slide.main_text || slide.title || "Investment Payoff"}</h2>
                        {slide.sub_text && <p className="text-lg text-gray-300">{slide.sub_text}</p>}
                        {/* Logic to display actual payoff effects might be complex here or handled by teacher narration */}
                    </div>
                );
            case 'kpi_summary_instructional':
            case 'leaderboard_chart': // For now, treat leaderboard charts also as images/videos if pre-rendered
            case 'game_end_summary':
                return (
                    <img
                        src={slide.source_url} // Assumes these are images for now
                        alt={slide.title || 'Summary Screen'}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                );
            default:
                return (
                    <div className="text-center">
                        <AlertCircle size={32} className="mx-auto mb-2 text-red-400"/>
                        <p className="text-lg">Unsupported slide type: {slide.type}</p>
                        <p className="text-sm text-gray-400">Content: {slide.main_text || slide.title}</p>
                    </div>
                );
        }
    };

    return (
        <div
            className={`h-full flex flex-col items-center justify-center text-white p-4 md:p-8 overflow-hidden ${slide.background_css || 'bg-gray-800'}`}>
            {/* Slide ID overlay - useful for teacher's preview, maybe not for student display */}
            {!isStudentView && slide.id && (
                <div className="absolute top-2 left-2 bg-black/40 rounded-full px-3 py-1 text-xs font-medium z-10">
                    SLIDE: {slide.id} {slide.title ? `(${slide.title})` : ''}
                </div>
            )}
            {renderContent()}
        </div>
    );
};

export default SlideRenderer;