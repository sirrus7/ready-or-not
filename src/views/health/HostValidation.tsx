// src/views/validation/ApplicationValidationPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, HardDrive, Radio, CheckCircle, XCircle, Loader2, Send, ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';
import {
    testDatabaseConnection,
    testStorageDownloadSpeed,
    testRealtimeChannelSend,
    testRealtimeChannelReceive,
    type TestResult
} from '@shared/services/ValidationTools';

// Speed thresholds (in MB/s)
const SPEED_THRESHOLD_GOOD = 2.5;       // 20 Mbps
const SPEED_THRESHOLD_ACCEPTABLE = 1.0; // 8 Mbps

// Utility function to generate a random ID to sync realtime test
const generateUniqueId = (): string => {
    return `${Date.now()}-${Math.floor(Math.random() * 10000)}`
};

enum TestStatus {
    idle,
    running,
    success,
    error,
}

const HostValidation: React.FC = () => {
    const navigate = useNavigate();

    // Unique ID per page load
    const identifier = generateUniqueId();

    // Database test state
    const [dbStatus, setDbStatus] = useState<TestStatus>(TestStatus.idle);
    const [dbResult, setDbResult] = useState<TestResult | null>(null);

    // Storage test state
    const [storageStatus, setStorageStatus] = useState<TestStatus>(TestStatus.idle);
    const [storageResult, setStorageResult] = useState<TestResult | null>(null);

    // Realtime test state
    const [realtimeStatus, setRealtimeStatus] = useState<TestStatus>(TestStatus.idle);
    const [realtimeResult, setRealtimeResult] = useState<TestResult | null>(null);

    // QR code state
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);

    // Auto-run database and storage tests on mount
    useEffect(() => {
        runDatabaseTest();
        runStorageTest();
        generateQRCode();
    }, []);

    const runDatabaseTest = async () => {
        setDbStatus(TestStatus.running);
        setDbResult(null);
        const result = await testDatabaseConnection();
        setDbResult(result);
        setDbStatus(result.success ? TestStatus.success : TestStatus.error);
    };

    const runStorageTest = async () => {
        setStorageStatus(TestStatus.running);
        setStorageResult(null);
        const result = await testStorageDownloadSpeed();
        setStorageResult(result);
        setStorageStatus(result.success ? TestStatus.success : TestStatus.error);
    };

    const runRealtimeTest = async () => {
        setRealtimeStatus(TestStatus.running);
        setRealtimeResult(null);

        const sendResult = await testRealtimeChannelSend(`validation-host-send-${identifier}`, {
            type: 'validation',
            timestamp: Date.now(),
            message: 'Test message from validation page'
        });

        if (!sendResult.success) {
            setRealtimeStatus(TestStatus.error);
            setRealtimeResult(sendResult);
            return;
        }

        const receiveResult = await testRealtimeChannelReceive(`validation-host-receive-${identifier}`, 15000);

        if (!receiveResult.success) {
            setRealtimeStatus(TestStatus.error);
            setRealtimeResult(receiveResult);
            return;
        }

        setRealtimeStatus(TestStatus.success);
        setRealtimeResult({
            success: true,
            message: 'Successfully validated host player communication',
            duration: (sendResult.duration ?? 0) + (receiveResult.duration ?? 0)
        });
    };

    const generateQRCode = async () => {
        setIsGeneratingQR(true);
        try {
            const mobileTestUrl = `${window.location.origin}/validation/mobile/${identifier}`;
            const qrCode = await QRCode.toDataURL(mobileTestUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            setQrCodeDataUrl(qrCode);
        } catch (error) {
            console.error('Error generating QR code:', error);
            setQrCodeDataUrl(null);
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const getStatusIcon = (status: TestStatus) => {
        switch (status) {
            case TestStatus.running:
                return (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-game-cream-50 to-game-cream-100 flex items-center justify-center shadow-md">
                        <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                    </div>
                );
            case TestStatus.success:
                return (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-game-cream-50 to-game-cream-100 flex items-center justify-center shadow-md">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                );
            case TestStatus.error:
                return (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-game-cream-50 to-game-cream-100 flex items-center justify-center shadow-md">
                        <XCircle className="w-6 h-6 text-red-500" />
                    </div>
                );
            default:
                return (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-game-cream-50 to-game-cream-100 flex items-center justify-center shadow-md">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                    </div>
                );
        }
    };

    const getStatusBadge = (status: TestStatus) => {
        switch (status) {
            case TestStatus.running:
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        Testing...
                    </span>
                );
            case TestStatus.success:
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Passed
                    </span>
                );
            case TestStatus.error:
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        Pending
                    </span>
                );
        }
    };

    const getSpeedBadge = (speedMBps: number) => {
        if (speedMBps >= SPEED_THRESHOLD_GOOD) {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Fast
                </span>
            );
        } else if (speedMBps >= SPEED_THRESHOLD_ACCEPTABLE) {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    Moderate
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Slow
                </span>
            );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-game-cream-50 to-game-cream-100">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header with logo and back button */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Logo */}
                        <img
                            src="/images/ready-or-not-logo.png"
                            alt="Ready or Not 2.0"
                            className="h-20 w-auto rounded-lg shadow-sm"
                        />

                        {/* Title */}
                        <div>
                            <h1 className="text-4xl font-bold text-game-brown-800">
                                Application Validation
                            </h1>
                            <p className="text-game-brown-600 mt-1">
                                System connectivity and performance diagnostics
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 px-6 py-3 bg-game-orange-600 text-white rounded-lg hover:bg-game-orange-700 transition-colors font-semibold shadow-md"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Dashboard
                    </button>
                </div>

                {/* Test Sections Grid */}
                <div className="space-y-6">

                    {/* System Status Summary - Moved to top */}
                    <div className="bg-white rounded-lg shadow-lg border border-game-brown-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    All critical systems should show "Passed" status
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold">
                                    <span className={`${dbStatus === TestStatus.success ? 'text-green-600' : 'text-gray-400'}`}>
                                        {dbStatus === TestStatus.success ? '✓' : '○'}
                                    </span>
                                    <span className="mx-2 text-gray-300">/</span>
                                    <span className={`${storageStatus === TestStatus.success ? 'text-green-600' : 'text-gray-400'}`}>
                                        {storageStatus === TestStatus.success ? '✓' : '○'}
                                    </span>
                                    <span className="mx-2 text-gray-300">/</span>
                                    <span className={`${realtimeStatus === TestStatus.success ? 'text-green-600' : 'text-gray-400'}`}>
                                        {realtimeStatus === TestStatus.success ? '✓' : '○'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">Tests Passed</p>
                            </div>
                        </div>
                    </div>

                    {/* Realtime Test Section - Full Width */}
                    <div className="bg-white rounded-lg shadow-lg border border-game-brown-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Radio className="w-6 h-6 text-white" />
                                    <h2 className="text-xl font-bold text-white">Realtime Communication Test</h2>
                                </div>
                                {getStatusIcon(realtimeStatus)}
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* Left side - Test controls and results */}
                                <div>
                                    <div className="mb-4">
                                        {getStatusBadge(realtimeStatus)}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1 mb-3">
                                        Use this test to validate player to host communication. Scan the QR code to open the mobile testing validation page and then begin the test.
                                    </p>
                                    <button
                                        onClick={runRealtimeTest}
                                        disabled={realtimeStatus === TestStatus.running}
                                        className="w-full mb-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {realtimeStatus === TestStatus.running ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Test Running...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Start Test
                                            </>
                                        )}
                                    </button>

                                    {realtimeResult && (
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Status:</p>
                                                <p className="text-gray-900">{realtimeResult.message}</p>
                                            </div>

                                            {realtimeResult.duration !== undefined && (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Response Time:</p>
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {realtimeResult.duration.toFixed(2)}ms
                                                    </p>
                                                </div>
                                            )}

                                            {realtimeResult.error && (
                                                <div className="bg-red-50 border border-red-200 rounded p-3">
                                                    <p className="text-sm font-medium text-red-800">Error:</p>
                                                    <p className="text-sm text-red-700">{realtimeResult.error}</p>
                                                </div>
                                            )}

                                        </div>
                                    )}
                                </div>

                                {/* Right side - QR Code */}
                                <div className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8">
                                    {isGeneratingQR ? (
                                        <div className="text-center">
                                            <Loader2 className="w-12 h-12 mx-auto text-purple-500 animate-spin mb-4" />
                                            <p className="text-gray-600 font-medium">Generating QR Code...</p>
                                        </div>
                                    ) : qrCodeDataUrl ? (
                                        <div className="text-center">
                                            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 inline-block mb-4">
                                                <img
                                                    src={qrCodeDataUrl}
                                                    alt="QR Code for mobile test"
                                                    className="w-48 h-48"
                                                />
                                            </div>
                                            <p className="text-gray-600 font-medium">Scan to test mobile connection</p>
                                            <a
                                                href={`${window.location.origin}/validation/mobile/${identifier}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-600 hover:text-purple-700 text-sm font-medium underline"
                                            >
                                                Or open link manually
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center mb-4">
                                                <span className="text-gray-500">Failed to generate QR</span>
                                            </div>
                                            <button
                                                onClick={generateQRCode}
                                                className="text-purple-600 hover:text-purple-700 font-medium"
                                            >
                                                Try Again
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Database Test Section */}
                        <div className="bg-white rounded-lg shadow-lg border border-game-brown-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-game-orange-500 to-game-orange-600 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Database className="w-6 h-6 text-white" />
                                        <h2 className="text-xl font-bold text-white">Database Connection</h2>
                                    </div>
                                    {getStatusIcon(dbStatus)}
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="mb-4">
                                    {getStatusBadge(dbStatus)}
                                </div>

                                {dbResult && (
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Status:</p>
                                            <p className="text-gray-900">{dbResult.message}</p>
                                        </div>

                                        {dbResult.duration !== undefined && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Response Time:</p>
                                                <p className="text-2xl font-bold text-game-orange-600">
                                                    {dbResult.duration.toFixed(2)}ms
                                                </p>
                                            </div>
                                        )}

                                        {dbResult.error && (
                                            <div className="bg-red-50 border border-red-200 rounded p-3">
                                                <p className="text-sm font-medium text-red-800">Error:</p>
                                                <p className="text-sm text-red-700">{dbResult.error}</p>
                                            </div>
                                        )}

                                    </div>
                                )}

                                {dbStatus === TestStatus.running && !dbResult && (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-game-orange-500" />
                                        <p className="ml-3 text-gray-600">Testing database connection...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Storage Speed Test Section */}
                        <div className="bg-white rounded-lg shadow-lg border border-game-brown-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <HardDrive className="w-6 h-6 text-white" />
                                        <h2 className="text-xl font-bold text-white">Storage Speed Test</h2>
                                    </div>
                                    {getStatusIcon(storageStatus)}
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="mb-4">
                                    <div className="flex gap-2 items-center">
                                        {getStatusBadge(storageStatus)}
                                        {storageResult?.details?.downloadSpeedMBps && (
                                            getSpeedBadge(parseFloat(storageResult.details.downloadSpeedMBps))
                                        )}
                                    </div>
                                </div>

                                {storageResult && (
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Status:</p>
                                            <p className="text-gray-900">{storageResult.message}</p>
                                        </div>

                                        {storageResult.duration !== undefined && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Download Time:</p>
                                                <p className="text-2xl font-bold text-blue-600">
                                                    {storageResult.duration.toFixed(0)}ms
                                                </p>
                                            </div>
                                        )}

                                        {storageResult.details?.downloadSpeedMBps && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Download Speed:</p>
                                                <p className="text-xl font-bold text-blue-600">
                                                    {storageResult.details.downloadSpeedMBps} MB/s
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    ({storageResult.details.downloadSpeedMbps} Mbps)
                                                </p>
                                            </div>
                                        )}

                                        {storageResult.error && (
                                            <div className="bg-red-50 border border-red-200 rounded p-3">
                                                <p className="text-sm font-medium text-red-800">Error:</p>
                                                <p className="text-sm text-red-700">{storageResult.error}</p>
                                            </div>
                                        )}

                                    </div>
                                )}

                                {storageStatus === TestStatus.running && !storageResult && (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                        <p className="ml-3 text-gray-600">Testing storage speed...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default HostValidation;