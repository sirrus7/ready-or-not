// src/views/host/components/Dashboard/HowToHostVideos.tsx
import React, {useEffect, useState} from 'react';
import {PlayCircle, Loader2} from 'lucide-react';
import Modal from '@shared/components/UI/Modal';
import {supabase} from '@shared/services/supabase';

/**
 * The "How to Host" training videos shown in the Dashboard's Training & Support
 * column. Files live in the private Supabase Storage bucket `training-videos`
 * (host-facing support content, kept separate from the in-game `slide-content`
 * bucket) and are served via short-lived signed URLs to authenticated hosts.
 * Titles come from IGD (Eric Hedaa, 2026-09-08).
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

const HowToHostVideos: React.FC = () => {
    const [activeVideo, setActiveVideo] = useState<HostVideo | null>(null);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!activeVideo) {
            setSignedUrl(null);
            setError(null);
            return;
        }

        let cancelled = false;
        setSignedUrl(null);
        setError(null);

        supabase.storage
            .from(TRAINING_VIDEOS_BUCKET)
            .createSignedUrl(activeVideo.path, SIGNED_URL_TTL_SECONDS)
            .then(({data, error: urlError}) => {
                if (cancelled) return;
                if (urlError || !data?.signedUrl) {
                    setError('This video is temporarily unavailable. Please try again.');
                    return;
                }
                setSignedUrl(data.signedUrl);
            });

        return () => {
            cancelled = true;
        };
    }, [activeVideo]);

    return (
        <>
            <div className="rounded-lg bg-white shadow-lg border-2 border-indigo-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                        <PlayCircle size={20} className="text-indigo-600"/>
                    </div>
                    <div className="font-semibold text-gray-900">How to Host Videos</div>
                </div>
                <div className="px-2 pb-2">
                    {HOST_VIDEOS.map((video) => (
                        <button
                            key={video.part}
                            type="button"
                            onClick={() => setActiveVideo(video)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors group text-left"
                        >
                            <div className="bg-indigo-100 p-2 rounded-lg group-hover:bg-indigo-200 transition-colors">
                                <PlayCircle size={18} className="text-indigo-600"/>
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-gray-900">{video.title}</div>
                                <div className="text-sm text-gray-500">Call part {video.part}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <Modal
                isOpen={activeVideo !== null}
                onClose={() => setActiveVideo(null)}
                title={activeVideo ? `Part ${activeVideo.part}: ${activeVideo.title}` : ''}
                size="3xl"
            >
                <div className="w-full aspect-video rounded-lg bg-black flex items-center justify-center overflow-hidden">
                    {error ? (
                        <p className="text-sm text-gray-300 px-4 text-center">{error}</p>
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
        </>
    );
};

export default HowToHostVideos;
