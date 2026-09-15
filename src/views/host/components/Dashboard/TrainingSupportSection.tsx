// src/views/host/components/Dashboard/TrainingSupportSection.tsx
import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {
    LifeBuoy, GraduationCap, Download, PlayCircle, BookOpen, Users,
    Bot, CheckCircle2, Mail, Phone, ExternalLink, ArrowRight, Loader2,
} from 'lucide-react';
import Modal from '@shared/components/UI/Modal';
import {supabase} from '@shared/services/supabase';
import {RONBOT_GPT_URL} from '@views/host/components/GameControls/RonBotHelpModal';

/**
 * The Training & Support sidebar column on the host Dashboard.
 *
 * Design system for this column: every item is one row — icon chip, title,
 * one-line description, and a trailing glyph that says what the row does
 * (download, play, external link, arrow). Rows are grouped by the host's
 * task: learn to host, classroom resources, get help. The How to Host Guide
 * is the single emphasized element; everything else stays quiet.
 *
 * The How to Host videos live in the private Supabase Storage bucket
 * `training-videos` (separate from the in-game `slide-content` bucket) and
 * are streamed to logged-in hosts via short-lived signed URLs. Titles come
 * from IGD (Eric Hedaa, 2026-09-08).
 */
const TRAINING_VIDEOS_BUCKET = 'training-videos';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour, matches slide media

interface HostVideo {
    part: number;
    title: string;
    /** Object path within TRAINING_VIDEOS_BUCKET. */
    path: string;
}

const HOST_VIDEOS: HostVideo[] = [
    {part: 1, title: 'Setting Up a Game', path: 'setting-up-a-game.mp4'},
    {part: 2, title: 'Delivering a Game', path: 'delivering-a-game.mp4'},
    {part: 3, title: 'Pro-Tips', path: 'pro-tips.mp4'},
];

/** Shared inner layout for every row in the column. */
const RowBody: React.FC<{
    chip: React.ReactNode;
    title: string;
    description?: string;
    trailing: React.ReactNode;
}> = ({chip, title, description, trailing}) => (
    <>
        <div
            className="w-9 h-9 shrink-0 rounded-lg bg-white border border-blue-100 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors">
            {chip}
        </div>
        <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900">{title}</div>
            {description && <div className="text-sm text-gray-500">{description}</div>}
        </div>
        <span className="text-gray-400 group-hover:text-blue-600 transition-colors">{trailing}</span>
    </>
);

const rowClass =
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/80 transition-colors group text-left';

const GroupHeading: React.FC<{children: React.ReactNode}> = ({children}) => (
    <h3 className="text-sm font-semibold text-gray-700 px-3 pb-1">{children}</h3>
);

const TrainingSupportSection: React.FC = () => {
    const [activeVideo, setActiveVideo] = useState<HostVideo | null>(null);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [videoError, setVideoError] = useState<string | null>(null);

    useEffect(() => {
        if (!activeVideo) {
            setSignedUrl(null);
            setVideoError(null);
            return;
        }

        let cancelled = false;
        setSignedUrl(null);
        setVideoError(null);

        supabase.storage
            .from(TRAINING_VIDEOS_BUCKET)
            .createSignedUrl(activeVideo.path, SIGNED_URL_TTL_SECONDS)
            .then(({data, error}) => {
                if (cancelled) return;
                if (error || !data?.signedUrl) {
                    setVideoError('This video is temporarily unavailable. Please try again.');
                    return;
                }
                setSignedUrl(data.signedUrl);
            });

        return () => {
            cancelled = true;
        };
    }, [activeVideo]);

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl border-2 border-blue-200">
            <div className="p-5 border-b border-blue-200 bg-white bg-opacity-80 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-xl">
                        <LifeBuoy size={28} className="text-blue-600"/>
                    </div>
                    Training & Support
                </h2>
            </div>

            <div className="p-4 space-y-5">
                {/* Learn to host */}
                <div>
                    <GroupHeading>Learn to host</GroupHeading>
                    <a
                        href="/game-materials/core/how-to-host-guide.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-xl bg-white shadow-sm border border-blue-200 hover:border-blue-400 hover:shadow transition-all group"
                    >
                        <div className="shrink-0 bg-blue-600 p-2.5 rounded-lg">
                            <GraduationCap size={22} className="text-white"/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900">How to Host Guide</div>
                            <div className="text-sm text-gray-500">
                                Start here — the complete guide to hosting RON 2.0
                            </div>
                        </div>
                        <Download size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors"/>
                    </a>
                    <div className="mt-1">
                        {HOST_VIDEOS.map((video) => (
                            <button
                                key={video.part}
                                type="button"
                                onClick={() => setActiveVideo(video)}
                                aria-label={`Watch video, call part ${video.part}: ${video.title}`}
                                className={rowClass}
                            >
                                <RowBody
                                    chip={<span className="font-semibold text-blue-700">{video.part}</span>}
                                    title={video.title}
                                    trailing={<PlayCircle size={16}/>}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Classroom resources */}
                <div>
                    <GroupHeading>Classroom resources</GroupHeading>
                    <a
                        href="/game-materials/core/vocabulary-definitions.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={rowClass}
                    >
                        <RowBody
                            chip={<BookOpen size={18}/>}
                            title="Vocabulary & Definitions"
                            description="Business terms reference"
                            trailing={<Download size={16}/>}
                        />
                    </a>
                    <a
                        href="/game-materials/core/vocabulary-quiz.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={rowClass}
                    >
                        <RowBody
                            chip={<Users size={18}/>}
                            title="Vocabulary Quiz"
                            description="Assessment tool for students"
                            trailing={<Download size={16}/>}
                        />
                    </a>
                </div>

                {/* Get help */}
                <div>
                    <GroupHeading>Get help</GroupHeading>
                    <a
                        href={RONBOT_GPT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={rowClass}
                    >
                        <RowBody
                            chip={<Bot size={18}/>}
                            title="RONBOT"
                            description="Ask questions, get instant troubleshooting"
                            trailing={<ExternalLink size={16}/>}
                        />
                    </a>
                    <Link to="/validation" className={rowClass}>
                        <RowBody
                            chip={<CheckCircle2 size={18}/>}
                            title="Application Validation"
                            description="Check connectivity and performance"
                            trailing={<ArrowRight size={16}/>}
                        />
                    </Link>
                    <a href="mailto:ehedaa.igd@shiftadvantage.com" className={rowClass}>
                        <RowBody
                            chip={<Mail size={18}/>}
                            title="Email support"
                            description="ehedaa.igd@shiftadvantage.com"
                            trailing={<ArrowRight size={16}/>}
                        />
                    </a>
                    <a href="tel:+1-503-333-8687" className={rowClass}>
                        <RowBody
                            chip={<Phone size={18}/>}
                            title="Call (503) 333-8687"
                            description="Talk to a person"
                            trailing={<ArrowRight size={16}/>}
                        />
                    </a>
                </div>
            </div>

            <Modal
                isOpen={activeVideo !== null}
                onClose={() => setActiveVideo(null)}
                title={activeVideo ? `Part ${activeVideo.part}: ${activeVideo.title}` : ''}
                size="3xl"
            >
                <div className="w-full aspect-video rounded-lg bg-black flex items-center justify-center overflow-hidden">
                    {videoError ? (
                        <p className="text-sm text-gray-300 px-4 text-center">{videoError}</p>
                    ) : signedUrl ? (
                        <video
                            key={signedUrl}
                            src={signedUrl}
                            controls
                            autoPlay
                            controlsList="nodownload"
                            className="w-full h-full"
                        >
                            Your browser does not support the video tag.
                        </video>
                    ) : (
                        <Loader2 size={32} className="text-gray-400 animate-spin"/>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default TrainingSupportSection;
