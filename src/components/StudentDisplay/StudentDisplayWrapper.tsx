// src/components/StudentDisplay/StudentDisplayWrapper.tsx - Updated version

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import StudentDisplayView from './StudentDisplayView';
import { Slide, TeacherBroadcastPayload } from '../../types';
import { readyOrNotGame_2_0_DD } from '../../data/gameStructure';
import { createMonitoredChannel, supabase } from '../../lib/supabase';
import { Hourglass, Wifi, WifiOff, AlertCircle } from 'lucide-react';

const StudentDisplayWrapper: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
    const [isPlayingTargetState, setIsPlayingTargetState] = useState<boolean>(false);
    const [videoTimeTargetState, setVideoTimeTargetState] = useState<number | undefined>(undefined);
    const [triggerSeekEventState, setTriggerSeekEventState] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>("Connecting to game session...");
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [connectionType, setConnectionType] = useState<'broadcast' | 'supabase' | 'none'>('none');
    const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

    const gameStructureInstance = useMemo(() => readyOrNotGame_2_0_DD, []);
    const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
    const supabaseChannelRef = useRef<any>(null);
    const lastSlideIdRef = useRef<number | null>(null);
    const connectionAttempts = useRef<number>(0);
    const maxConnectionAttempts = 10;

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
        connectionAttempts.current = 0; // Reset on successful update
    };

    // Setup BroadcastChannel (works for same-origin, same-browser-context)
    const setupBroadcastChannel = () => {
        if (!sessionId) return;

        const channelName = `classroom-${sessionId}`;
        console.log(`[StudentDisplayWrapper] Setting up BroadcastChannel: ${channelName}`);

        try {
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

            broadcastChannelRef.current.onerror = (error) => {
                console.error(`[StudentDisplayWrapper] BroadcastChannel error:`, error);
            };

            // Announce ready and request state
            broadcastChannelRef.current.postMessage({
                type: 'STUDENT_DISPLAY_READY',
                payload: { sessionId }
            });

            // Request initial state multiple times
            setTimeout(() => {
                broadcastChannelRef.current?.postMessage({
                    type: 'STUDENT_DISPLAY_REQUEST_STATE',
                    payload: { sessionId }
                });
            }, 500);

            setTimeout(() => {
                broadcastChannelRef.current?.postMessage({
                    type: 'STUDENT_DISPLAY_REQUEST_STATE',
                    payload: { sessionId }
                });
            }, 2000);

            console.log(`[StudentDisplayWrapper] BroadcastChannel setup complete`);
        } catch (error) {
            console.error(`[StudentDisplayWrapper] BroadcastChannel setup failed:`, error);
        }
    };

    // Setup Supabase real-time (works across different origins/devices)
    const setupSupabaseChannel = () => {
        if (!sessionId) return;

        const realtimeChannelName = `teacher-updates-${sessionId}`;
        console.log(`[StudentDisplayWrapper] Setting up Supabase channel: ${realtimeChannelName}`);

        try {
            // Clean up existing channel first
            if (supabaseChannelRef.current) {
                console.log(`[StudentDisplayWrapper] Cleaning up existing Supabase channel`);
                if (supabaseChannelRef.current.unsubscribe) {
                    supabaseChannelRef.current.unsubscribe();
                }
                supabaseChannelRef.current = null;
            }

            supabaseChannelRef.current = createMonitoredChannel(realtimeChannelName);

            supabaseChannelRef.current.on('broadcast', { event: 'teacher_state_update' }, (payload: any) => {
                console.log(`[StudentDisplayWrapper] Supabase broadcast received:`, payload.payload);
                setConnectionType('supabase');
                updateSlideState(payload.payload, 'Supabase');
            });

            supabaseChannelRef.current.subscribe((status: string) => {
                console.log(`[StudentDisplayWrapper] Supabase subscription status: ${status}`);
                if (status === 'SUBSCRIBED') {
                    console.log(`[StudentDisplayWrapper] Successfully subscribed to Supabase real-time`);
                    setConnectionType('supabase');
                    setIsConnected(true);
                    connectionAttempts.current = 0;
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    console.log(`[StudentDisplayWrapper] Supabase connection lost: ${status}`);
                    if (connectionType === 'supabase' || connectionType === 'none') {
                        setIsConnected(false);
                        attemptReconnection();
                    }
                }
            });

            console.log(`[StudentDisplayWrapper] Supabase channel setup complete`);
        } catch (error) {
            console.error(`[StudentDisplayWrapper] Supabase setup failed:`, error);
            attemptReconnection();
        }
    };

    const attemptReconnection = () => {
        if (connectionAttempts.current < maxConnectionAttempts) {
            connectionAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, connectionAttempts.current - 1), 10000); // Exponential backoff, max 10s

            console.log(`[StudentDisplayWrapper] Attempting reconnection ${connectionAttempts.current}/${maxConnectionAttempts} in ${delay}ms`);
            setStatusMessage(`Connection lost. Reconnecting... (${connectionAttempts.current}/${maxConnectionAttempts})`);

            setTimeout(() => {
                setupSupabaseChannel();
            }, delay);
        } else {
            setStatusMessage("Connection failed after multiple attempts. Please refresh the page or check with your teacher.");
        }
    };

    // Test connection with a simple query
    const testSupabaseConnection = async () => {
        try {
            console.log(`[StudentDisplayWrapper] Testing Supabase connection`);
            const { data, error } = await supabase
                .from('sessions')
                .select('id')
                .eq('id', sessionId)
                .limit(1);

            if (error) {
                console.error(`[StudentDisplayWrapper] Supabase test query failed:`, error);
                return false;
            }

            console.log(`[StudentDisplayWrapper] Supabase connection test successful`);
            return true;
        } catch (error) {
            console.error(`[StudentDisplayWrapper] Supabase connection test error:`, error);
            return false;
        }
    };

    useEffect(() => {
        if (!sessionId) {
            setStatusMessage("Error: No Session ID provided in URL.");
            return;
        }

        console.log(`[StudentDisplayWrapper] Initializing for session: ${sessionId}`);
        setStatusMessage(`Connecting to game session: ${sessionId}...`);

        // Test Supabase connection first
        testSupabaseConnection().then(isSupabaseWorking => {
            if (isSupabaseWorking) {
                console.log(`[StudentDisplayWrapper] Supabase is working, setting up channels`);
                setupBroadcastChannel();
                setupSupabaseChannel();
            } else {
                console.log(`[StudentDisplayWrapper] Supabase connection failed, trying broadcast only`);
                setupBroadcastChannel();
                setStatusMessage("Limited connection mode. Make sure you're using the same browser as the teacher.");
            }
        });

        // Set timeout to show connection status
        const connectionTimeout = setTimeout(() => {
            if (!isConnected) {
                setStatusMessage(`Still connecting to session: ${sessionId}... Make sure the teacher has started the game and this window was opened from the teacher's control panel.`);
            }
        }, 5000);

        // Set a longer timeout for final status
        const finalTimeout = setTimeout(() => {
            if (!isConnected) {
                console.log(`[StudentDisplayWrapper] No connection established after 15 seconds`);
                setStatusMessage(`Connection timeout. Please make sure:\n1. The teacher has started the game session\n2. This window was opened from the teacher's control panel\n3. You're connected to the internet`);
            }
        }, 15000);

        return () => {
            console.log(`[StudentDisplayWrapper] Cleaning up connections`);

            clearTimeout(connectionTimeout);
            clearTimeout(finalTimeout);

            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                    type: 'STUDENT_DISPLAY_CLOSING',
                    payload: { sessionId }
                });
                broadcastChannelRef.current.close();
                broadcastChannelRef.current = null;
            }

            if (supabaseChannelRef.current) {
                if (supabaseChannelRef.current.unsubscribe) {
                    supabaseChannelRef.current.unsubscribe();
                }
                supabaseChannelRef.current = null;
            }
        };
    }, [sessionId]);

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-900 relative">
            {/* Connection status indicator */}
            <div className="absolute top-4 right-4 z-50 bg-black/90 text-white px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <>
                            <Wifi size={14} className="text-green-400" />
                            <span className="text-green-400">Connected ({connectionType})</span>
                        </>
                    ) : (
                        <>
                            <WifiOff size={14} className="text-red-400" />
                            <span className="text-red-400">Connecting...</span>
                        </>
                    )}
                </div>
                {lastUpdateTime && (
                    <div className="text-gray-400 mt-1">Last: {lastUpdateTime}</div>
                )}
                {connectionAttempts.current > 0 && (
                    <div className="text-yellow-400 mt-1">Retry: {connectionAttempts.current}/{maxConnectionAttempts}</div>
                )}
            </div>

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
                    <div className="text-center max-w-lg">
                        {isConnected ? (
                            <Hourglass size={48} className="mb-4 text-blue-400 animate-pulse mx-auto" />
                        ) : (
                            <div className="mb-4">
                                <AlertCircle size={48} className="text-yellow-400 mx-auto mb-2" />
                                <div className="flex items-center justify-center gap-2 text-sm">
                                    <WifiOff size={16} />
                                    <span>Connection: {connectionType}</span>
                                </div>
                            </div>
                        )}

                        <p className="text-xl mb-4 whitespace-pre-line">{statusMessage}</p>

                        <div className="text-sm text-gray-400 space-y-2">
                            <p>Session ID: {sessionId}</p>
                            <p>Status: {isConnected ? `✓ Connected via ${connectionType}` : '✗ Not connected'}</p>
                            {connectionAttempts.current > 0 && (
                                <p>Reconnection attempts: {connectionAttempts.current}/{maxConnectionAttempts}</p>
                            )}
                            {lastUpdateTime && (
                                <p>Last update: {lastUpdateTime}</p>
                            )}
                        </div>

                        {!isConnected && (
                            <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                                <p className="text-yellow-400 text-sm font-semibold mb-2">Troubleshooting:</p>
                                <ul className="text-xs text-yellow-300 space-y-1 text-left">
                                    <li>• Make sure the teacher has started the game session</li>
                                    <li>• This window should be opened from the teacher's "Launch Student Display" button</li>
                                    <li>• Check that you're using the correct session URL</li>
                                    <li>• Try refreshing this page</li>
                                    <li>• Ensure your internet connection is stable</li>
                                    {connectionAttempts.current >= maxConnectionAttempts && (
                                        <li className="text-red-300">• Max reconnection attempts reached - please refresh the page</li>
                                    )}
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