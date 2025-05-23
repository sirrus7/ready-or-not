// src/components/StudentDisplay/StudentDisplayWrapper.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import StudentDisplayView from './StudentDisplayView';
import { Slide, TeacherBroadcastPayload } from '../../types';
import { readyOrNotGame_2_0_DD } from '../../data/gameStructure';
import { supabase } from '../../lib/supabase';
import { Hourglass, Wifi, WifiOff, AlertCircle } from 'lucide-react';

const StudentDisplayWrapper: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isPlayingTargetState, setIsPlayingTargetState] = useState<boolean>(false);
    const [videoTimeTargetState, setVideoTimeTargetState] = useState<number | undefined>(undefined);
    const [triggerSeekEventState, setTriggerSeekEventState] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>("Initializing Student Display...");
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [connectionType, setConnectionType] = useState<'broadcast' | 'supabase' | 'none'>('none');
    const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD, []);
    const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
    const supabaseChannelRef = useRef<any>(null);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSlideIdRef = useRef<number | null>(null);

    useEffect(() => {
        document.title = `Student Display - Session ${sessionId || 'N/A'}`;
    }, [sessionId]);

    // Helper function to update slide state
    const updateSlideState = (payload: TeacherBroadcastPayload, source: string) => {
        console.log(`[StudentDisplayWrapper] Processing update from ${source}:`, payload);

        const slideData = payload.currentSlideId !== null
            ? gameStructureInstance.slides.find(s => s.id === payload.currentSlideId) || null
            : null;

        console.log(`[StudentDisplayWrapper] Looking for slide ID: ${payload.currentSlideId}`);
        console.log(`[StudentDisplayWrapper] Found slide:`, slideData?.title || 'Not found');

        // Only update if the slide actually changed
        if (payload.currentSlideId !== lastSlideIdRef.current) {
            lastSlideIdRef.current = payload.currentSlideId;
            setCurrentSlide(slideData);
            console.log(`[StudentDisplayWrapper] Slide updated to:`, slideData?.title || 'null');
        }

        setIsPlayingTargetState(payload.isPlayingVideo);
        setVideoTimeTargetState(payload.videoCurrentTime);
        setTriggerSeekEventState(payload.triggerVideoSeek || false);

        if (payload.triggerVideoSeek) {
            setTimeout(() => setTriggerSeekEventState(false), 100);
        }

        setStatusMessage("");
        setIsConnected(true);
        setLastUpdateTime(new Date().toLocaleTimeString());
    };

    // Setup BroadcastChannel (works for same-origin, same-browser-context)
    const setupBroadcastChannel = () => {
        if (!sessionId) return;

        const channelName = `classroom-${sessionId}`;
        console.log(`[StudentDisplayWrapper] Setting up BroadcastChannel: ${channelName}`);

        broadcastChannelRef.current = new BroadcastChannel(channelName);

        broadcastChannelRef.current.onmessage = (event) => {
            console.log(`[StudentDisplayWrapper] BroadcastChannel message:`, event.data);
            setConnectionType('broadcast');

            if (event.data.type === 'TEACHER_STATE_UPDATE') {
                updateSlideState(event.data.payload, 'BroadcastChannel');
            } else if (event.data.type === 'SESSION_ENDED_BY_TEACHER') {
                setCurrentSlide(null);
                setIsPlayingTargetState(false);
                setStatusMessage("The game session has ended. You can close this window.");
                setIsConnected(false);
            }
        };

        // Announce ready and request state
        broadcastChannelRef.current.postMessage({
            type: 'STUDENT_DISPLAY_READY',
            payload: { sessionId }
        });

        // Request initial state
        setTimeout(() => {
            broadcastChannelRef.current?.postMessage({
                type: 'STUDENT_DISPLAY_REQUEST_STATE',
                payload: { sessionId }
            });
        }, 1000);

        console.log(`[StudentDisplayWrapper] BroadcastChannel setup complete`);
    };

    // Setup Supabase real-time (works across different origins/devices)
    const setupSupabaseChannel = () => {
        if (!sessionId) return;

        const realtimeChannelName = `teacher-updates-${sessionId}`;
        console.log(`[StudentDisplayWrapper] Setting up Supabase channel: ${realtimeChannelName}`);

        // Clean up existing channel first
        if (supabaseChannelRef.current) {
            console.log(`[StudentDisplayWrapper] Cleaning up existing Supabase channel`);
            supabase.removeChannel(supabaseChannelRef.current);
            supabaseChannelRef.current = null;
        }

        supabaseChannelRef.current = supabase.channel(realtimeChannelName);

        supabaseChannelRef.current.on('broadcast', { event: 'teacher_state_update' }, (payload: any) => {
            console.log(`[StudentDisplayWrapper] Supabase broadcast received:`, payload.payload);
            setConnectionType('supabase');
            updateSlideState(payload.payload, 'Supabase');
        });

        supabaseChannelRef.current.subscribe((status: string) => {
            console.log(`[StudentDisplayWrapper] Supabase subscription status: ${status}`);
            if (status === 'SUBSCRIBED') {
                console.log(`[StudentDisplayWrapper] Successfully subscribed to Supabase real-time`);
                setIsConnected(true);
                setConnectionType('supabase');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                console.log(`[StudentDisplayWrapper] Supabase connection lost, attempting reconnect in 3 seconds`);
                if (connectionType === 'supabase') {
                    setIsConnected(false);

                    // Attempt to reconnect after a delay
                    setTimeout(() => {
                        console.log(`[StudentDisplayWrapper] Attempting Supabase reconnection`);
                        setupSupabaseChannel();
                    }, 3000);
                }
            }
        });

        console.log(`[StudentDisplayWrapper] Supabase channel setup complete`);
    };

    useEffect(() => {
        if (!isConnected && sessionId) {
            const reconnectInterval = setInterval(() => {
                console.log(`[StudentDisplayWrapper] Connection lost, attempting to reconnect...`);

                // Try to reconnect both channels
                setupBroadcastChannel();
                setupSupabaseChannel();
            }, 10000); // Reconnect every 10 seconds

            return () => {
                clearInterval(reconnectInterval);
            };
        }
    }, [isConnected, sessionId, setupBroadcastChannel, setupSupabaseChannel]);

    useEffect(() => {
        if (!sessionId) {
            setStatusMessage("Error: No Session ID provided in URL.");
            return;
        }

        setStatusMessage(`Connecting to game session: ${sessionId}...`);

        // Setup both communication methods
        setupBroadcastChannel();
        setupSupabaseChannel();

        // Set timeout to show connection status
        connectionTimeoutRef.current = setTimeout(() => {
            if (!isConnected) {
                setStatusMessage(`Still connecting to session: ${sessionId}... Make sure the teacher has started the game.`);
            }
        }, 5000);

        // Set a longer timeout to show which connection method is working
        setTimeout(() => {
            if (isConnected) {
                console.log(`[StudentDisplayWrapper] Connection established via: ${connectionType}`);
            } else {
                console.log(`[StudentDisplayWrapper] No connection established after 10 seconds`);
                setStatusMessage("Connection timeout. Please check if the teacher has started the game session.");
            }
        }, 10000);

        return () => {
            console.log(`[StudentDisplayWrapper] Cleaning up connections`);

            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
            }

            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                    type: 'STUDENT_DISPLAY_CLOSING',
                    payload: { sessionId }
                });
                broadcastChannelRef.current.close();
                broadcastChannelRef.current = null;
            }

            if (supabaseChannelRef.current) {
                supabase.removeChannel(supabaseChannelRef.current);
                supabaseChannelRef.current = null;
            }
        };
    }, [sessionId]);

    // Debug information component
    const DebugInfo = () => (
        <div className="absolute top-0 right-0 bg-black/90 text-white p-3 text-xs z-50 max-w-sm border-l-2 border-blue-500">
            <div className="font-bold text-blue-400 mb-2">Student Display Debug</div>
            <div className="space-y-1">
                <div>Session: {sessionId}</div>
                <div className="flex items-center gap-2">
                    <span>Status:</span>
                    {isConnected ? (
                        <span className="flex items-center gap-1 text-green-400">
                            <Wifi size={12} />
                            Connected via {connectionType}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-red-400">
                            <WifiOff size={12} />
                            Disconnected
                        </span>
                    )}
                </div>
                {lastUpdateTime && (
                    <div>Last Update: {lastUpdateTime}</div>
                )}
                {currentSlide && (
                    <>
                        <div className="border-t border-gray-600 pt-2 mt-2">
                            <div>Slide ID: {currentSlide.id}</div>
                            <div>Type: {currentSlide.type}</div>
                            <div>Title: {currentSlide.title || 'Untitled'}</div>
                            <div>Has Source: {currentSlide.source_url ? 'Yes' : 'No'}</div>
                            <div>Playing: {isPlayingTargetState ? 'Yes' : 'No'}</div>
                            {videoTimeTargetState !== undefined && (
                                <div>Video Time: {videoTimeTargetState.toFixed(1)}s</div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-900 relative">
            {/* Debug Info - remove in production */}
            <DebugInfo />

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
                    <div className="text-center max-w-md">
                        {isConnected ? (
                            <Hourglass size={48} className="mb-4 text-blue-400 animate-pulse mx-auto" />
                        ) : (
                            <div className="mb-4">
                                <AlertCircle size={48} className="text-yellow-400 mx-auto mb-2" />
                                <div className="flex items-center justify-center gap-2 text-sm">
                                    <WifiOff size={16} />
                                    <span>Connection Status: {connectionType}</span>
                                </div>
                            </div>
                        )}

                        <p className="text-xl mb-4">{statusMessage}</p>

                        <div className="text-sm text-gray-400 space-y-2">
                            <p>Session ID: {sessionId}</p>
                            <p>Connection: {isConnected ? `✓ ${connectionType}` : '✗ Not connected'}</p>
                            {lastUpdateTime && (
                                <p>Last Update: {lastUpdateTime}</p>
                            )}
                        </div>

                        {!isConnected && (
                            <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                                <p className="text-yellow-400 text-sm font-semibold mb-2">Troubleshooting:</p>
                                <ul className="text-xs text-yellow-300 space-y-1 text-left">
                                    <li>• Make sure the teacher has started the game session</li>
                                    <li>• Check that you're using the correct session URL</li>
                                    <li>• Try refreshing this page</li>
                                    <li>• Ensure your browser allows real-time connections</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDisplayWrapper;