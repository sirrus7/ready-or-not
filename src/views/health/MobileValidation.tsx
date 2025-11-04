// src/views/validation/MobileValidationTestPage.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Radio, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import {
    testRealtimeChannelReceive,
    testRealtimeChannelSend,
    type TestResult
} from '@shared/services/ValidationTools';

type TestStatus = 'idle' | 'running' | 'success' | 'error';

const MobileValidationTestPage: React.FC = () => {
    const { testId } = useParams<{ testId: string }>();
    const [status, setStatus] = useState<TestStatus>('idle');
    const [result, setResult] = useState<TestResult | null>(null);

    const runTest = async () => {
        if (!testId) {
            setStatus('error');
            setResult({
                success: false,
                message: 'No test ID provided in URL',
                error: 'Missing test ID parameter'
            });
            return;
        }

        setStatus('running');
        setResult(null);

        // Step 1: Listen for message from desktop on 
        const receiveChannel = `validation-host-send-${testId}`;
        const sendChannel = `validation-host-receive-${testId}`;

        const receiveResult = await testRealtimeChannelReceive(receiveChannel, 30000);

        if (!receiveResult.success) {
            setResult(receiveResult);
            setStatus('error');
            return;
        }

        // Step 2: Send response back to desktop on 'validation-host-${testId}'
        const sendResult = await testRealtimeChannelSend(sendChannel, {
            type: 'validation-mobile-to-desktop',
            timestamp: Date.now(),
            message: 'Response from mobile test page',
            testId: testId
        });

        if (!sendResult.success) {
            setResult(sendResult);
            setStatus('error');
            return;
        }

        // Mobile test is successful when it sends the response
        setResult({
            success: true,
            message: 'Test completed successfully! Message received and response sent.',
            duration: receiveResult.duration,
            details: {
                receivedMessage: receiveResult.details,
                sentResponse: sendResult.success
            }
        });
        setStatus('success')
    };

    const resetTest = () => {
        setStatus('idle');
        setResult(null);
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'running':
                return <Loader2 className="w-20 h-20 animate-spin text-purple-400" />;
            case 'success':
                return <CheckCircle className="w-20 h-20 text-green-400" />;
            case 'error':
                return <XCircle className="w-20 h-20 text-red-400" />;
            default:
                return <Radio className="w-20 h-20 text-gray-400" />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'running':
                return 'Waiting for test message...';
            case 'success':
                return 'Test Passed!';
            case 'error':
                return 'Test Failed';
            default:
                return 'Ready to Test';
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
            default:
                return 'text-gray-300';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-4 py-4">
                <div className="flex items-center justify-center gap-3">
                    <Radio className="w-6 h-6 text-purple-400" />
                    <h1 className="text-xl font-bold text-white">
                        Realtime Test
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

                        {/* Instructions or Results */}
                        {status === 'idle' && (
                            <div className="text-center space-y-4">
                                <p className="text-gray-300 leading-relaxed">
                                    This test verifies that your device can receive realtime messages from the server and send responses back.
                                </p>
                                <div className="bg-gray-700/50 rounded-lg p-4 text-left">
                                    <p className="text-sm text-gray-300 font-semibold mb-2">Instructions:</p>
                                    <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                                        <li>Press "Run Test" below</li>
                                        <li>Click "Begin Test" on the desktop page</li>
                                        <li>Wait for this page to receive and respond to the message</li>
                                    </ol>
                                </div>
                                {testId && (
                                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                                        <p className="text-xs text-purple-300 font-mono break-all">
                                            Test ID: {testId}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {status === 'running' && (
                            <div className="text-center space-y-4">
                                <p className="text-gray-300">
                                    Waiting for test message from desktop...
                                </p>
                                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                                    <p className="text-sm text-purple-300">
                                        Now click "Begin Test" on the desktop validation page
                                    </p>
                                </div>
                            </div>
                        )}

                        {status === 'success' && result && (
                            <div className="space-y-4">
                                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                                    <p className="text-sm font-medium text-green-300 mb-2">Success!</p>
                                    <p className="text-sm text-green-200">{result.message}</p>
                                </div>

                                {result.duration && (
                                    <div className="bg-gray-700/50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-300 mb-1">Response Time:</p>
                                        <p className="text-2xl font-bold text-white">
                                            {result.duration.toFixed(2)}ms
                                        </p>
                                    </div>
                                )}

                                {result.details && (
                                    <details className="bg-gray-700/50 rounded-lg p-4">
                                        <summary className="text-sm font-medium text-gray-300 cursor-pointer">
                                            View Details
                                        </summary>
                                        <pre className="text-xs text-gray-400 mt-2 overflow-auto">
                                            {JSON.stringify(result.details, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {status === 'error' && result && (
                            <div className="space-y-4">
                                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                                    <p className="text-sm font-medium text-red-300 mb-2">Test Failed</p>
                                    <p className="text-sm text-red-200">{result.message}</p>
                                </div>

                                {result.error && (
                                    <div className="bg-gray-700/50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-300 mb-1">Error:</p>
                                        <p className="text-sm text-red-300">{result.error}</p>
                                    </div>
                                )}

                                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                                    <p className="text-xs text-yellow-200">
                                        <strong>Troubleshooting:</strong> Make sure you sent a test message from the desktop page while this test was running.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-4 space-y-3">
                            {status === 'idle' && (
                                <button
                                    onClick={runTest}
                                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Radio className="w-5 h-5" />
                                    Run Test
                                </button>
                            )}

                            {status === 'running' && (
                                <button
                                    disabled
                                    className="w-full bg-gray-700 text-gray-400 px-6 py-4 rounded-xl font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Test Running...
                                </button>
                            )}

                            {(status === 'success' || status === 'error') && (
                                <button
                                    onClick={resetTest}
                                    className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-4 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Try Again
                                </button>
                            )}
                        </div>

                        {/* Timer Warning */}
                        {status === 'running' && (
                            <div className="text-center">
                                <p className="text-xs text-gray-500">
                                    Test will timeout after 30 seconds if no message is received
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Ready or Not 2.0 - Application Validation
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MobileValidationTestPage;