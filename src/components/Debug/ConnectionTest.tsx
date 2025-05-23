// src/components/Debug/ConnectionTest.tsx
// Add this as a temporary component to test connections
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ConnectionTestProps {
    sessionId: string;
}

export const ConnectionTest: React.FC<ConnectionTestProps> = ({ sessionId }) => {
    const [messages, setMessages] = useState<string[]>([]);
    const [broadcastStatus, setBroadcastStatus] = useState<'disconnected' | 'connected'>('disconnected');
    const [supabaseStatus, setSupabaseStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

    const addMessage = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setMessages(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
    };

    useEffect(() => {
        // Test BroadcastChannel
        const broadcastChannel = new BroadcastChannel(`classroom-${sessionId}`);

        broadcastChannel.onmessage = (event) => {
            setBroadcastStatus('connected');
            addMessage(`BC: ${event.data.type}`);
        };

        broadcastChannel.postMessage({ type: 'TEST_MESSAGE', payload: 'Testing BroadcastChannel' });
        setBroadcastStatus('connected');

        // Test Supabase
        setSupabaseStatus('connecting');
        const supabaseChannel = supabase.channel(`test-${sessionId}`);

        supabaseChannel.on('broadcast', { event: 'test' }, (payload) => {
            addMessage(`SB: Received ${JSON.stringify(payload)}`);
        });

        supabaseChannel.subscribe((status) => {
            addMessage(`SB Status: ${status}`);
            if (status === 'SUBSCRIBED') {
                setSupabaseStatus('connected');
                // Send test message
                supabaseChannel.send({
                    type: 'broadcast',
                    event: 'test',
                    payload: { message: 'Test message', timestamp: Date.now() }
                });
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                setSupabaseStatus('disconnected');
            }
        });

        return () => {
            broadcastChannel.close();
            supabase.removeChannel(supabaseChannel);
        };
    }, [sessionId]);

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-sm z-50">
            <div className="text-sm font-bold mb-2">Connection Test</div>
            <div className="text-xs space-y-1">
                <div>Session: {sessionId}</div>
                <div>BroadcastChannel:
                    <span className={`ml-1 ${broadcastStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                        {broadcastStatus}
                    </span>
                </div>
                <div>Supabase:
                    <span className={`ml-1 ${supabaseStatus === 'connected' ? 'text-green-400' : supabaseStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {supabaseStatus}
                    </span>
                </div>
                <div className="border-t border-gray-600 pt-2 mt-2">
                    <div className="font-semibold mb-1">Messages:</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                        {messages.map((msg, i) => (
                            <div key={i} className="text-xs text-gray-300">{msg}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};