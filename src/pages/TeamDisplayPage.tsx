// src/pages/TeamDisplayPage.tsx - Refactored with New Supabase Structure
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useParams} from 'react-router-dom';
import TeamLogin from '../components/Game/TeamLogin';
import KpiDisplay from '../components/Game/KpiDisplay';
import DecisionPanel from '../components/Game/DecisionPanel';
import {
    ChallengeOption,
    GamePhaseNode,
    InvestmentOption,
    Slide,
    HostBroadcastPayload,
} from '../types';
import {db, useSupabaseConnection} from '../utils/supabase';
import {useSupabaseQuery, useSupabaseMutation} from '../hooks/useSupabaseOperation'
import {readyOrNotGame_2_0_DD} from '../data/gameStructure';
import {AlertTriangle, CheckCircle, Hourglass, Smartphone} from 'lucide-react';
import { useBroadcastManager } from '../utils/broadcastManager';

const TeamDisplayPage: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(localStorage.getItem(`ron_teamId_${sessionId}`));
    const [loggedInTeamName, setLoggedInTeamName] = useState<string | null>(localStorage.getItem(`ron_teamName_${sessionId}`));
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [currentActivePhase, setCurrentActivePhase] = useState<GamePhaseNode | null>(null);
    const [isStudentDecisionTime, setIsStudentDecisionTime] = useState<boolean>(false);
    const [decisionPhaseTimerEndTime, setDecisionPhaseTimerEndTime] = useState<number | undefined>(undefined);
    const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | undefined>(undefined);
    const [decisionOptionsKey, setDecisionOptionsKey] = useState<string | undefined>(undefined);
    const [pageError, setPageError] = useState<string | null>(null);
    const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
    const [isSubmissionFeedbackModalOpen, setIsSubmissionFeedbackModalOpen] = useState(false);

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);
    const isStudentDecisionTimeRef = useRef(isStudentDecisionTime);
    const currentActivePhaseRef = useRef<GamePhaseNode | null>(null);
    const decisionPhaseTimerEndTimeRef = useRef<number | undefined>(undefined);

    // Use broadcast manager for team communication
    const broadcastManager = useBroadcastManager(sessionId || null, 'display');

    // Check if we're on mobile/tablet
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android.*(?:(?!Mobile)|(?=.*Tablet))|KFAPWI/i.test(navigator.userAgent);

    const connection = useSupabaseConnection();

    // Enhanced query for team KPIs with automatic refetching
    const {
        data: currentTeamKpis,
        isLoading: isLoadingKpis,
        error: kpisError,
        refresh: refetchKpis
    } = useSupabaseQuery(
        () => {
            if (!sessionId || !loggedInTeamId || !currentActivePhase || currentActivePhase.round_number === 0) {
                return Promise.resolve(null);
            }
            return db.kpis.getForTeamRound(sessionId, loggedInTeamId, currentActivePhase.round_number);
        },
        [sessionId, loggedInTeamId, currentActivePhase?.round_number],
        {
            cacheKey: `team-kpis-${sessionId}-${loggedInTeamId}-${currentActivePhase?.round_number}`,
            cacheTimeout: 30 * 1000, // 30 seconds
            retryOnError: true,
            maxRetries: 2,
            onError: (error) => {
                console.error("[TeamDisplayPage] Error fetching team KPIs:", error);
                setPageError(`Failed to load your team's data: ${error}`);
            }
        }
    );

    // Enhanced mutation for decision submission
    const {
        execute: submitDecision,
        isLoading: isSubmittingDecision,
        error: submissionError
    } = useSupabaseMutation(
        async (decisionData: any) => {
            if (!sessionId || !loggedInTeamId || !currentActivePhase) {
                throw new Error('Missing required data for submission');
            }

            const submissionPayload = {
                ...decisionData,
                session_id: sessionId,
                team_id: loggedInTeamId,
                phase_id: currentActivePhase.id,
                round_number: currentActivePhase.round_number as 0 | 1 | 2 | 3,
                submitted_at: new Date().toISOString(),
            };

            return db.decisions.create(submissionPayload);
        },
        {
            onSuccess: () => {
                setSubmissionMessage(`Decisions for ${currentActivePhase?.label} submitted successfully!`);
                setIsStudentDecisionTime(false);
                isStudentDecisionTimeRef.current = false;
                setTimeRemainingSeconds(undefined);
                setDecisionPhaseTimerEndTime(undefined);

                // Auto-dismiss success message
                setTimeout(() => setSubmissionMessage(null), 5000);
            },
            onError: (error) => {
                console.error('[TeamDisplayPage] Submission failed:', error);
                setSubmissionMessage(`Failed to submit decisions: ${error}`);
            }
        }
    );

    // Set initial viewport for mobile
    useEffect(() => {
        if (isMobile || isTablet) {
            const viewport = document.querySelector('meta[name=viewport]');
            if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
            }
        }
    }, [isMobile, isTablet]);

    useEffect(() => {
        isStudentDecisionTimeRef.current = isStudentDecisionTime;
    }, [isStudentDecisionTime]);

    useEffect(() => {
        currentActivePhaseRef.current = currentActivePhase;
    }, [currentActivePhase]);

    useEffect(() => {
        decisionPhaseTimerEndTimeRef.current = decisionPhaseTimerEndTime;
    }, [decisionPhaseTimerEndTime]);

    // Set up broadcast manager for teacher updates
    useEffect(() => {
        if (!sessionId || !broadcastManager) {
            return;
        }

        console.log(`[TeamDisplayPage] Setting up broadcast listener for teacher updates`);

        // Subscribe to teacher state updates
        const unsubscribeTeacherUpdates = broadcastManager.subscribe('teacher_state_update', (message) => {
            console.log(`[TeamDisplayPage] Received teacher broadcast:`, message);

            const teacherPayload = message as HostBroadcastPayload;
            const newPhaseNode = teacherPayload.currentPhaseId ? gameStructure.allPhases.find(p => p.id === teacherPayload.currentPhaseId) || null : null;
            const newSlide = teacherPayload.currentSlideId !== null ? gameStructure.slides.find(s => s.id === teacherPayload.currentSlideId) || null : null;

            // Update state immediately
            setCurrentActivePhase(newPhaseNode);
            setCurrentActiveSlide(newSlide);
            setDecisionOptionsKey(teacherPayload.decisionOptionsKey);

            // Decision activation logic
            const shouldActivateDecisions = teacherPayload.isDecisionPhaseActive &&
                loggedInTeamId &&
                newPhaseNode?.is_interactive_player_phase &&
                (newSlide?.type === 'interactive_invest' ||
                    newSlide?.type === 'interactive_choice' ||
                    newSlide?.type === 'interactive_double_down_prompt' ||
                    newSlide?.type === 'interactive_double_down_select');

            if (shouldActivateDecisions) {
                console.log(`[TeamDisplayPage] ACTIVATING decision time for phase ${newPhaseNode?.id}, slide ${newSlide?.id}`);
                setIsStudentDecisionTime(true);
                isStudentDecisionTimeRef.current = true;

                // Clear any previous submission messages when starting new decision phase
                setSubmissionMessage(null);
            } else if (!teacherPayload.isDecisionPhaseActive) {
                console.log(`[TeamDisplayPage] DEACTIVATING decision time - broadcast says not active`);
                setIsStudentDecisionTime(false);
                isStudentDecisionTimeRef.current = false;
            }

            // Handle timer
            if (teacherPayload.decisionPhaseTimerEndTime !== decisionPhaseTimerEndTimeRef.current) {
                setDecisionPhaseTimerEndTime(teacherPayload.decisionPhaseTimerEndTime);
            }

            // Refresh KPIs when phase changes to a different round
            if (loggedInTeamId && newPhaseNode && newPhaseNode.round_number > 0) {
                if (currentActivePhaseRef.current?.round_number !== newPhaseNode.round_number) {
                    refetchKpis();
                }
            }
        });

        return () => {
            console.log(`[TeamDisplayPage] Cleaning up broadcast subscription`);
            unsubscribeTeacherUpdates();
        };
    }, [sessionId, broadcastManager, gameStructure, loggedInTeamId, refetchKpis]);

    // Timer effect
    useEffect(() => {
        let timerInterval: NodeJS.Timeout | undefined;
        if (isStudentDecisionTimeRef.current && decisionPhaseTimerEndTime && decisionPhaseTimerEndTime > Date.now()) {
            const updateTimer = () => {
                const now = Date.now();
                const remaining = Math.max(0, Math.round((decisionPhaseTimerEndTime - now) / 1000));
                setTimeRemainingSeconds(remaining);
                if (remaining <= 0) {
                    clearInterval(timerInterval);
                }
            };
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
        } else {
            setTimeRemainingSeconds(undefined);
            if (timerInterval) clearInterval(timerInterval);
        }
        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [isStudentDecisionTime, decisionPhaseTimerEndTime]);

    // Auto-submit on timer end
    useEffect(() => {
        if (isStudentDecisionTimeRef.current && timeRemainingSeconds === 0 &&
            currentActivePhase?.phase_type === 'choice' &&
            !isSubmittingDecision) {

            console.log(`[TeamDisplayPage] Timer ended for CHOICE phase ${currentActivePhase.id}. Auto-submitting default.`);

            const optionsKey = decisionOptionsKey || currentActivePhase.id;
            const options = gameStructure.all_challenge_options[optionsKey] || [];
            const defaultOption = options.find(opt => opt.is_default_choice) || (options.length > 0 ? options[options.length - 1] : null);

            if (defaultOption && loggedInTeamId && sessionId && currentActivePhase) {
                setSubmissionMessage('Time is up! Submitting the default choice...');

                const decisionData = {
                    selected_challenge_option_id: defaultOption.id,
                };

                submitDecision(decisionData);
            }
        }
    }, [timeRemainingSeconds, currentActivePhase, gameStructure, decisionOptionsKey, loggedInTeamId, sessionId, isSubmittingDecision, submitDecision]);

    const handleLoginSuccess = (teamId: string, teamName: string) => {
        localStorage.setItem(`ron_teamId_${sessionId}`, teamId);
        localStorage.setItem(`ron_teamName_${sessionId}`, teamName);
        setLoggedInTeamId(teamId);
        setLoggedInTeamName(teamName);
        setPageError(null);
    };

    const handleDecisionSubmit = async (decisionDataPayload: any) => {
        console.log('[TeamDisplayPage] === DECISION SUBMIT START ===');
        console.log('[TeamDisplayPage] sessionId:', sessionId);
        console.log('[TeamDisplayPage] loggedInTeamId:', loggedInTeamId);
        console.log('[TeamDisplayPage] currentActivePhase:', currentActivePhase);
        console.log('[TeamDisplayPage] decisionDataPayload:', decisionDataPayload);

        if (!sessionId || !loggedInTeamId || !currentActivePhase) {
            const missingItems = [];
            if (!sessionId) missingItems.push('sessionId');
            if (!loggedInTeamId) missingItems.push('loggedInTeamId');
            if (!currentActivePhase) missingItems.push('currentActivePhase');

            console.error('[TeamDisplayPage] Missing required data:', missingItems);
            setSubmissionMessage(`Cannot submit: Missing ${missingItems.join(', ')}`);
            setIsSubmissionFeedbackModalOpen(true);
            return;
        }

        setSubmissionMessage(`Submitting decisions for ${currentActivePhase.label}...`);
        await submitDecision(decisionDataPayload);
    };

    // Computed values for current phase
    const investmentOptionsForCurrentPhase = useMemo((): InvestmentOption[] => {
        if (currentActivePhase?.phase_type === 'invest' && decisionOptionsKey && gameStructure) {
            const options = gameStructure.all_investment_options[decisionOptionsKey] || [];
            return options;
        }
        return [];
    }, [currentActivePhase, gameStructure, decisionOptionsKey]);

    const challengeOptionsForCurrentPhase = useMemo((): ChallengeOption[] => {
        if (currentActivePhase && (currentActivePhase.phase_type === 'choice' || currentActivePhase.phase_type === 'double-down-prompt') && decisionOptionsKey && gameStructure) {
            return gameStructure.all_challenge_options[decisionOptionsKey] || [];
        }
        return [];
    }, [currentActivePhase, gameStructure, decisionOptionsKey]);

    const rd3InvestmentsForDoubleDown = useMemo((): InvestmentOption[] => {
        if (loggedInTeamId && currentActivePhase?.phase_type === 'double-down-select' && gameStructure) {
            const rd3InvestKey = `rd3-invest`;
            return gameStructure.all_investment_options[rd3InvestKey] || [];
        }
        return [];
    }, [currentActivePhase, gameStructure, loggedInTeamId]);

    // Show connection error prominently
    if (connection.status === 'error' && !connection.isConnected) {
        return (
            <div className="min-h-screen bg-red-900 text-white flex flex-col items-center justify-center p-4">
                <AlertTriangle size={48} className="mb-4 text-yellow-300"/>
                <h1 className="text-2xl font-bold mb-2 text-center">Connection Problem</h1>
                <p className="text-center mb-4 px-4">{connection.error}</p>
                <div className="flex gap-3">
                    <button
                        onClick={connection.forceReconnect}
                        className="px-6 py-3 bg-yellow-400 text-red-900 font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
                    >
                        Reconnect
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    if (pageError) {
        return (
            <div className="min-h-screen bg-red-900 text-white flex flex-col items-center justify-center p-4">
                <AlertTriangle size={48} className="mb-4 text-yellow-300"/>
                <h1 className="text-2xl font-bold mb-2 text-center">Application Error</h1>
                <p className="text-center mb-4 px-4">{pageError}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-yellow-400 text-red-900 font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
                >
                    Try Reloading Page
                </button>
            </div>
        );
    }

    if (!sessionId) {
        return (
            <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">
                <div className="text-center">
                    <Smartphone size={48} className="mx-auto mb-4 text-red-400"/>
                    <p className="text-lg">Error: Invalid session link. Please check the URL.</p>
                </div>
            </div>
        );
    }

    if (!loggedInTeamId || !loggedInTeamName) {
        return <TeamLogin sessionId={sessionId} onLoginSuccess={handleLoginSuccess}/>;
    }

    const kpiRoundLabel = currentActivePhase?.round_number ?
        `RD-${currentActivePhase.round_number} ${currentActivePhase.phase_type === 'kpi' || currentActivePhase.phase_type === 'leaderboard' ? 'Final ' : ''}Status`
        : (loggedInTeamId ? "Connecting..." : "Game Setup");

    const budgetForInvestPhase = currentActivePhase?.phase_type === 'invest' && decisionOptionsKey && gameStructure.investment_phase_budgets?.[decisionOptionsKey]
        ? gameStructure.investment_phase_budgets[decisionOptionsKey]
        : 0;

    return (
        <div
            className={`min-h-screen bg-gray-900 text-white flex flex-col ${isMobile || isTablet ? 'touch-manipulation' : ''}`}
            style={{minHeight: '100vh'}}>

            {/* KPI Display - Fixed header */}
            <div className="flex-shrink-0 sticky top-0 z-10">
                <KpiDisplay
                    teamName={loggedInTeamName}
                    currentRoundLabel={kpiRoundLabel}
                    kpis={currentTeamKpis}
                />
            </div>

            {/* Main Content - Single scroll container */}
            <div className="flex-1 min-h-0">
                <div className="h-full overflow-y-auto">
                    <div className="p-3 md:p-4 min-h-full flex flex-col">
                        {(isLoadingKpis && currentActivePhase?.round_number > 0) || !currentActivePhase ? (
                            <div className="flex-1 flex items-center justify-center text-center text-gray-400 py-12">
                                <div>
                                    <Hourglass size={40} className="mx-auto mb-4 animate-pulse"/>
                                    <p className="text-lg">
                                        {isLoadingKpis && currentActivePhase ? `Loading data for ${currentActivePhase.label}...` :
                                            !currentActivePhase ? "Waiting for game to start..." :
                                                "Loading..."}
                                    </p>
                                </div>
                            </div>
                        ) : isStudentDecisionTimeRef.current && currentActivePhase && !isSubmittingDecision ? (
                            <div className="flex-1">
                                <DecisionPanel
                                    sessionId={sessionId}
                                    teamId={loggedInTeamId}
                                    currentPhase={currentActivePhase}
                                    investmentOptions={investmentOptionsForCurrentPhase}
                                    investUpToBudget={budgetForInvestPhase}
                                    challengeOptions={challengeOptionsForCurrentPhase}
                                    availableRd3Investments={rd3InvestmentsForDoubleDown}
                                    onDecisionSubmit={handleDecisionSubmit}
                                    isDecisionTime={isStudentDecisionTimeRef.current}
                                    timeRemainingSeconds={timeRemainingSeconds}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="max-w-xl w-full">
                                    {/* Show submission status prominently when available */}
                                    {submissionMessage && (
                                        <div className={`mb-6 p-4 rounded-xl border-2 shadow-lg text-center ${
                                            isSubmittingDecision ? 'bg-blue-900/50 border-blue-600 text-blue-200' :
                                                submissionError ? 'bg-red-900/50 border-red-600 text-red-200' :
                                                    submissionMessage.includes('successfully') ? 'bg-green-900/50 border-green-600 text-green-200' :
                                                        'bg-gray-800 border-gray-600 text-gray-200'
                                        }`}>
                                            <div className="flex items-center justify-center mb-2">
                                                {isSubmittingDecision &&
                                                    <Hourglass size={24} className="mr-2 animate-pulse"/>}
                                                {!isSubmittingDecision && submissionMessage.includes('successfully') &&
                                                    <CheckCircle size={24} className="mr-2"/>}
                                                {submissionError &&
                                                    <AlertTriangle size={24} className="mr-2"/>}
                                                <span className="text-lg font-semibold">
                                                    {isSubmittingDecision ? 'Submitting...' :
                                                        submissionMessage.includes('successfully') ? 'Success!' :
                                                            submissionError ? 'Error' : 'Status Update'}
                                                </span>
                                            </div>
                                            <p className="text-sm">{submissionMessage}</p>
                                            {submissionError && (
                                                <button
                                                    onClick={() => {
                                                        setSubmissionMessage(null);
                                                    }}
                                                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {currentActiveSlide ? (
                                        <div className="text-center p-6 bg-gray-800 rounded-xl shadow-lg">
                                            <h3 className="text-xl font-semibold text-sky-400 mb-3">
                                                {currentActiveSlide.title || currentActivePhase?.label || "Current Activity"}
                                            </h3>
                                            {currentActiveSlide.main_text && (
                                                <p className="text-lg text-gray-200 mb-2">{currentActiveSlide.main_text}</p>
                                            )}
                                            {currentActiveSlide.sub_text && (
                                                <p className="text-sm text-gray-300 mb-4">{currentActiveSlide.sub_text}</p>
                                            )}

                                            {submissionMessage?.includes('successfully') && !isSubmittingDecision && (
                                                <div className="mt-6 p-4 bg-green-900/50 rounded-lg border border-green-700">
                                                    <p className="text-green-400 flex items-center justify-center">
                                                        <CheckCircle size={20} className="mr-2"/>
                                                        Decisions submitted for {currentActivePhase?.label || "previous phase"}.
                                                        Waiting for facilitator.
                                                    </p>
                                                </div>
                                            )}
                                            {!submissionMessage?.includes('successfully') && !isStudentDecisionTimeRef.current && !submissionMessage && (
                                                <div className="mt-6 p-4 bg-yellow-900/50 rounded-lg border border-yellow-700">
                                                    <p className="text-yellow-400 flex items-center justify-center">
                                                        <Hourglass size={20} className="mr-2 animate-pulse"/>
                                                        Waiting for facilitator...
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400 py-12">
                                            <Hourglass size={40} className="mx-auto mb-4 animate-pulse"/>
                                            <p className="text-lg">
                                                {submissionMessage?.includes('successfully') && !isSubmittingDecision ?
                                                    "Decisions submitted. Waiting for facilitator..." :
                                                    `Waiting for facilitator to start ${currentActivePhase?.label || "next phase"}...`
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Safe area padding for mobile */}
                        {(isMobile || isTablet) && (
                            <div className="h-4 flex-shrink-0"
                                 style={{height: 'env(safe-area-inset-bottom, 1rem)'}}></div>
                        )}
                    </div>
                </div>
            </div>

            {/* Submission Feedback Modal - Only for critical errors */}
            {isSubmissionFeedbackModalOpen && submissionMessage?.includes('Cannot submit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center">
                        <AlertTriangle size={32} className="mx-auto mb-3 text-red-500"/>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Submission Error</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            {submissionMessage}
                        </p>
                        <button
                            onClick={() => {
                                setIsSubmissionFeedbackModalOpen(false);
                                setSubmissionMessage(null);
                            }}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Connection status indicator */}
            <div className="fixed bottom-4 right-4 z-20">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    connection.isConnected
                        ? 'bg-green-900/80 text-green-300 border border-green-700'
                        : 'bg-red-900/80 text-red-300 border border-red-700'
                }`}>
                    {connection.isConnected
                        ? `● Live ${connection.latency ? `(${connection.latency}ms)` : ''}`
                        : '● Disconnected'}
                </div>
            </div>
        </div>
    );
};

export default TeamDisplayPage;