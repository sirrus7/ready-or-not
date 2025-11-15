// src/views/validation/ApplicationValidationPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, HardDrive, Radio, CheckCircle, XCircle, Loader2, ArrowLeft, PlayCircle, RefreshCw, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import {
    testDatabaseConnection,
    testStorageDownloadSpeed,
    testRealtimeChannelSend,
    testRealtimeChannelReceive,
    type TestResult
} from '@shared/services/ValidationTools';

// Default of 2 minutes for connectivity tests
const DEFAULT_TIMEOUT = 120000;

// Utility function to generate a random GUID
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

    // Control whether testing has begun
    const [testingStarted, setTestingStarted] = useState(false);
    
    // Unique ID per page load
    const [identifier, setIdentifier] = useState(generateUniqueId());

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

    // Helper to determine if all tests are complete
    const allTestsComplete = 
        dbStatus !== TestStatus.idle && dbStatus !== TestStatus.running &&
        storageStatus !== TestStatus.idle && storageStatus !== TestStatus.running &&
        realtimeStatus !== TestStatus.idle && realtimeStatus !== TestStatus.running;

    // Handle begin testing - run all tests and generate QR
    const handleBeginTesting = async () => {
        setTestingStarted(true);
        runDatabaseTest();
        runStorageTest();
        runRealtimeTest();
        generateQRCode();
    };

    const handleResetTesting = () => {
        setTestingStarted(false);
        setIdentifier(generateUniqueId()); // Generate new ID for new test
        setDbStatus(TestStatus.idle);
        setDbResult(null);
        setStorageStatus(TestStatus.idle);
        setStorageResult(null);
        setRealtimeStatus(TestStatus.idle);
        setRealtimeResult(null);
        setQrCodeDataUrl(null);
    }

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

        // Start listening on channels
        const receiveResultPromise = testRealtimeChannelReceive(`validation-host-receive-${identifier}`, DEFAULT_TIMEOUT);
        const startResult = await testRealtimeChannelReceive(`validation-host-start-${identifier}`, DEFAULT_TIMEOUT);

        if (!startResult.success) {
            setRealtimeStatus(TestStatus.error);
            setRealtimeResult(startResult);
            return;
        }

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

        const receiveResult = await receiveResultPromise;

        if (!receiveResult.success) {
            setRealtimeStatus(TestStatus.error);
            setRealtimeResult(receiveResult);
            return;
        }

        // Success if we recieved, sent, and recieved again
        setRealtimeStatus(TestStatus.success);
        setRealtimeResult({
            success: true,
            message: 'Successfully validated host and player communication',
            duration: (sendResult.duration ?? 0) + (receiveResult.duration ?? 0)
        });
    };

    const generateQRCode = async () => {
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
    };

    // Helper function to rate network speed based on download speed in Mbps
    const getNetworkSpeedRating = (storageResult: TestResult | null) => {
        if (!storageResult?.details?.downloadSpeedMbps) return null;
        
        const speedMbps = parseFloat(storageResult.details.downloadSpeedMbps);
        
        // Rate based on download speed in Mbps
        // Excellent: >50 Mbps, Good: 20-50 Mbps, Fair: 10-20 Mbps, Slow: <10 Mbps
        if (speedMbps >= 50) {
            return { 
                rating: 'Excellent', 
                color: 'text-green-700', 
                bg: 'bg-green-50', 
                border: 'border-green-200',
                speedMbps: speedMbps.toFixed(0)
            };
        } else if (speedMbps >= 20) {
            return { 
                rating: 'Good', 
                color: 'text-blue-700', 
                bg: 'bg-blue-50', 
                border: 'border-blue-200',
                speedMbps: speedMbps.toFixed(0)
            };
        } else if (speedMbps >= 10) {
            return { 
                rating: 'Fair', 
                color: 'text-yellow-700', 
                bg: 'bg-yellow-50', 
                border: 'border-yellow-200',
                speedMbps: speedMbps.toFixed(0)
            };
        } else {
            return { 
                rating: 'Slow', 
                color: 'text-orange-700', 
                bg: 'bg-orange-50', 
                border: 'border-orange-200',
                speedMbps: speedMbps.toFixed(0)
            };
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-md">
                        <div className="w-6 h-6 rounded-full bg-gray-300" />
                    </div>
                );
        }
    };

    const getStatusBadge = (status: TestStatus) => {
        switch (status) {
            case TestStatus.running:
                return (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Running...
                    </span>
                );
            case TestStatus.success:
                return (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Passed
                    </span>
                );
            case TestStatus.error:
                return (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                        <XCircle className="w-4 h-4" />
                        Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                        Waiting...
                    </span>
                );
        }
    };

    // Show landing page before testing starts
    if (!testingStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-game-cream-50 to-game-cream-100">
                {/* Header with Logo and Back Button */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <header className="mb-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-4">
                                {/* Logo */}
                                <img
                                    src="/images/ready-or-not-logo.png"
                                    alt="Ready or Not 2.0"
                                    className="h-24 w-auto rounded-lg shadow-sm"
                                />
                                {/* Title */}
                                <div>
                                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                                        Application Validation
                                    </h1>
                                    <p className="text-gray-600 text-lg">
                                        Test your application's core functionality
                                    </p>
                                </div>
                            </div>
                            {/* Back Button styled like Create Game button */}
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 bg-game-orange-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-game-orange-700 transition-colors shadow-lg"
                            >
                                <ArrowLeft size={20} />
                                Back to Dashboard
                            </button>
                        </div>
                    </header>
                </div>

                {/* Landing Content */}
                <div className="max-w-2xl mx-auto px-4 pb-16">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                        {/* Hero Section */}
                        <div className="bg-gradient-to-br from-game-orange-600 to-game-orange-700 px-8 py-12 text-center">
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <PlayCircle className="w-12 h-12 text-white" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-3">
                                Ready to Validate?
                            </h2>
                            <p className="text-game-cream-50 text-lg">
                                Ensure everything is working correctly before your game
                            </p>
                        </div>

                        {/* Content */}
                        <div className="px-8 py-8 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    What will be tested:
                                </h3>
                                
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <Database className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-blue-900">Database Connection</h4>
                                            <p className="text-sm text-blue-700">Verify ability to fetch data</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                                        <HardDrive className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-green-900">Storage Connection and Speed</h4>
                                            <p className="text-sm text-green-700">Verify ability and speed to fetch game assets</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                        <Radio className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-semibold text-purple-900">Mobile Communication</h4>
                                            <p className="text-sm text-purple-700">Verify host-player communication</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>Note:</strong> Have your mobile device ready to scan the QR code for the mobile communication test.
                                </p>
                            </div>

                            <button
                                onClick={handleBeginTesting}
                                className="w-full bg-gradient-to-r from-game-orange-600 to-game-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-game-orange-700 hover:to-game-orange-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                            >
                                <PlayCircle className="w-6 h-6" />
                                Begin Testing
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show testing interface after "Begin Testing" is clicked
    const mobileTestUrl = `${window.location.origin}/validation/mobile/${identifier}`;
    const speedRating = getNetworkSpeedRating(storageResult);
    return (
        <div className="min-h-screen bg-gradient-to-br from-game-cream-50 to-game-cream-100">
            {/* Header with Logo and Back Button */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            {/* Logo */}
                            <img
                                src="/images/ready-or-not-logo.png"
                                alt="Ready or Not 2.0"
                                className="h-24 w-auto rounded-lg shadow-sm"
                            />
                            {/* Title */}
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                                    Application Validation
                                </h1>
                                <p className="text-gray-600 text-lg">
                                    Running validation tests...
                                </p>
                            </div>
                        </div>
                        {/* Back Button styled like Create Game button */}
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 bg-game-orange-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-game-orange-700 transition-colors shadow-lg"
                        >
                            <ArrowLeft size={20} />
                            Back to Dashboard
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Summary Card */}
                    <div className="lg:col-span-3 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Validation Summary</h2>
                            {allTestsComplete && (
                                <button
                                    onClick={handleResetTesting}
                                    className="flex items-center gap-2 bg-game-orange-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-game-orange-700 transition-colors shadow-md"
                                >
                                    <RefreshCw size={16} />
                                    Run Tests Again
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-gradient-to-br from-game-cream-50 to-white rounded-lg border border-gray-200">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Database className="w-5 h-5 text-blue-600" />
                                    <span className="font-semibold text-gray-700">Database</span>
                                </div>
                                <div className="flex justify-center">
                                    {dbStatus === TestStatus.success ? (
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    ) : dbStatus === TestStatus.error ? (
                                        <XCircle className="w-6 h-6 text-red-600" />
                                    ) : dbStatus === TestStatus.running ? (
                                        <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-300" />
                                    )}
                                </div>
                            </div>

                            <div className="text-center p-4 bg-gradient-to-br from-game-cream-50 to-white rounded-lg border border-gray-200">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <HardDrive className="w-5 h-5 text-green-600" />
                                    <span className="font-semibold text-gray-700">Storage</span>
                                </div>
                                <div className="flex justify-center">
                                    {storageStatus === TestStatus.success ? (
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    ) : storageStatus === TestStatus.error ? (
                                        <XCircle className="w-6 h-6 text-red-600" />
                                    ) : storageStatus === TestStatus.running ? (
                                        <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-300" />
                                    )}
                                </div>
                            </div>

                            <div className="text-center p-4 bg-gradient-to-br from-game-cream-50 to-white rounded-lg border border-gray-200">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Radio className="w-5 h-5 text-purple-600" />
                                    <span className="font-semibold text-gray-700">Realtime</span>
                                </div>
                                <div className="flex justify-center">
                                    {realtimeStatus === TestStatus.success ? (
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    ) : realtimeStatus === TestStatus.error ? (
                                        <XCircle className="w-6 h-6 text-red-600" />
                                    ) : realtimeStatus === TestStatus.running ? (
                                        <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-300" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Database Test Card */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Database className="w-6 h-6 text-white" />
                                    <h2 className="text-xl font-bold text-white">Database</h2>
                                </div>
                                {getStatusIcon(dbStatus)}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                {getStatusBadge(dbStatus)}
                            </div>
                            {dbResult && (
                                <div className={`mt-3 p-3 rounded-lg ${dbResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                    <p className={`text-sm ${dbResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {dbResult.message}
                                    </p>
                                    {dbResult.duration !== undefined && (
                                        <p className="text-xs text-gray-600 mt-1">
                                            Duration: {dbResult.duration.toFixed(0)}ms
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Storage Test Card */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <HardDrive className="w-6 h-6 text-white" />
                                    <h2 className="text-xl font-bold text-white">Storage</h2>
                                </div>
                                {getStatusIcon(storageStatus)}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                {getStatusBadge(storageStatus)}
                            </div>
                            {storageResult && (
                                <>
                                    <div className={`mt-3 p-3 rounded-lg ${storageResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                        <p className={`text-sm ${storageResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                            {storageResult.message}
                                        </p>
                                        {storageResult.duration !== undefined && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                Duration: {storageResult.duration.toFixed(0)}ms
                                            </p>
                                        )}
                                    </div>
                                    {/* Network Speed Rating */}
                                    {speedRating && storageResult.success && (
                                        <div className={`mt-3 p-3 rounded-lg border ${speedRating.bg} ${speedRating.border}`}>
                                            <p className={`text-sm font-medium ${speedRating.color}`}>
                                                Network Speed: {speedRating.rating} ({speedRating.speedMbps} Mbps)
                                            </p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {speedRating.rating === 'Excellent' && 'Your connection is very fast.'}
                                                {speedRating.rating === 'Good' && 'Your connection is fast'}
                                                {speedRating.rating === 'Fair' && 'Your connection is adequate, pre-loading content recommended.'}
                                                {speedRating.rating === 'Slow' && 'Your connection is slow, pre-loading content is heavily recommended. '}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Realtime Test Card */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Radio className="w-6 h-6 text-white" />
                                    <h2 className="text-xl font-bold text-white">Communication</h2>
                                </div>
                                {getStatusIcon(realtimeStatus)}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                {getStatusBadge(realtimeStatus)}
                            </div>

                            {/* QR Code */}
                            <div className="mb-4">
                                <div className="bg-white p-4 rounded-lg border-2 border-purple-200 flex justify-center">
                                    {!qrCodeDataUrl ? (
                                        <div className="flex items-center justify-center w-[200px] h-[200px]">
                                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                        </div>
                                    ) : (<img src={qrCodeDataUrl} alt="QR Code" className="w-[200px] h-[200px]" />)}
                                </div>
                                <p className="text-xs text-center text-gray-600 mt-2">
                                    Scan to open mobile test page
                                </p>
                                {/* Manual Link */}
                                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                    <p className="text-xs text-purple-700 mb-2 font-medium">Or open manually:</p>
                                    <a 
                                        href={mobileTestUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-purple-600 hover:text-purple-800 underline break-all flex items-center gap-1"
                                    >
                                        <span className="flex-1">{mobileTestUrl}</span>
                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                    </a>
                                </div>
                            </div>

                            {realtimeResult && (
                                <div className={`mt-3 p-3 rounded-lg ${realtimeResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                    <p className={`text-sm ${realtimeResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {realtimeResult.message}
                                    </p>
                                    {realtimeResult.duration !== undefined && (
                                        <p className="text-xs text-gray-600 mt-1">
                                            Duration: {realtimeResult.duration.toFixed(0)}ms
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostValidation;