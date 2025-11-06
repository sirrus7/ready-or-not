// src/views/validation/MobileValidationTestPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Radio, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import {
    testRealtimeChannelReceive,
    testRealtimeChannelSend,
    type TestResult
} from '@shared/services/ValidationTools';

type TestStatus = 'running' | 'success' | 'error';

const MobileValidationTestPage: React.FC = () => {
    const { testId } = useParams<{ testId: string }>();
    const [status, setStatus] = useState<TestStatus>('running');
    const [message, setMessage] = useState<string>("");
    const [error, setError] = useState<string>("");

    useEffect(() => {
        runTest()
    }, [testId])

    const runTest = async () => {
        if (!testId) {
            setStatus('error');
            setMessage('Try closing this page and reopening from validation page QR code or Link')
            setError('Invalid ID')
            return;
        }

        setStatus('running');
        setMessage('Ready, please start test from Validation Page')
        setError('');

        const startChannel = `validation-host-start-${testId}`;
        const receiveChannel = `validation-host-send-${testId}`;
        const sendChannel = `validation-host-receive-${testId}`;

        // Setup our channel to listen
        const receivePromise = testRealtimeChannelReceive(receiveChannel, 120000);

        // Send our start message to host
        const startResult = await testRealtimeChannelSend(startChannel, {
            type: 'validation-mobile-to-desktop',
            timestamp: Date.now(),
            message: 'Response from mobile test page',
            testId: testId
        });

        if (!startResult.success) {
            setStatus('error');
            setMessage('Error starting test, please close this page and try again');
            setError('Failed to send update');
            return;
        }

        // Wait for response from host
        const receiveResult = await receivePromise;

        if (!receiveResult.success) {
            setStatus('error');
            setMessage('Failed to receive update after 2 minutes');
            setError('Timed Out');
            return;
        }

        // Send final response to host
        const sendResult = await testRealtimeChannelSend(sendChannel, {
            type: 'validation-mobile-to-desktop',
            timestamp: Date.now(),
            message: 'Response from mobile test page',
            testId: testId
        });

        if (!sendResult.success) {
            setStatus('error');
            setMessage('Received message from host but was not able to send update');
            setError('Failed to send update');
            return;
        }

        // Mobile test is successful when it sends the response
        setStatus('success');
        setMessage('Test completed successfully! Able to recieve and sent updates.')
        setError('')
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'running':
                return <Loader2 className="w-20 h-20 animate-spin text-purple-400" />;
            case 'success':
                return <CheckCircle className="w-20 h-20 text-green-400" />;
            case 'error':
                return <XCircle className="w-20 h-20 text-red-400" />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'running':
                return 'Ready and waiting for host to start test...';
            case 'success':
                return 'Test Passed!';
            case 'error':
                return 'Test Failed';
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'running':
                return 'text-purple-300';
            case 'success':
                return 'text-green-300';
            case 'error':
                return 'text-red-300';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-4 py-4">
                <div className="flex items-center justify-center gap-3">
                    <Radio className="w-6 h-6 text-purple-400" />
                    <h1 className="text-xl font-bold text-white">
                        Connectivity Test
                    </h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-md mx-auto px-4 py-8">
                {/* Status Card */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">

                    {/* Status Icon Section */}
                    <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 px-6 py-12 text-center border-b border-gray-700">
                        <div className="flex justify-center mb-6">
                            {getStatusIcon()}
                        </div>
                        <h2 className={`text-2xl font-bold ${getStatusColor()}`}>
                            {getStatusText()}
                        </h2>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 space-y-6">
                        {status === 'running' && (
                            <div className="text-center space-y-4">
                                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                                    <p className="text-sm text-purple-300">
                                        Click "Start Test" on the desktop validation page
                                    </p>
                                </div>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="space-y-4">
                                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                                    <p className="text-sm font-medium text-green-300 mb-2">Success!</p>
                                    <p className="text-sm text-green-200">{message}</p>
                                </div>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-4">
                                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                                    <p className="text-sm font-medium text-red-300 mb-2">Test Failed</p>
                                    <p className="text-sm text-red-200">{message}</p>
                                </div>

                                {error && (
                                    <div className="bg-gray-700/50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-300 mb-1">Error:</p>
                                        <p className="text-sm text-red-300">{error}</p>
                                    </div>
                                )}

                                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                                    <p className="text-xs text-yellow-200">
                                        <strong>Troubleshooting: </strong>
                                        Ensure that firewalls or other networking restrictions aren't blocking traffic. Try using 
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Timer Warning */}
                        
                            <div className="text-center">
                                <p className="text-xs text-gray-500">
                                    {status === 'running' ? 
                                        <>Test will timeout after 2 minutes if no message is received</> : 
                                        <>This window can now be closed. Do not reload this page, launch from the Application Validation page each time you test.</>
                                    }
                                </p>
                            </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Ready or Not - Application Validation
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MobileValidationTestPage;