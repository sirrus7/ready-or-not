// src/pages/CompanyDisplayPage.tsx - FIXED VERSION
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useParams} from 'react-router-dom';
import TeamLogin from '../components/StudentGame/TeamLogin';
import KpiDisplay from '../components/StudentGame/KpiDisplay';
import DecisionPanel from '../components/StudentGame/DecisionPanel';
import {
    ChallengeOption,
    GamePhaseNode,
    InvestmentOption,
    Slide,
    TeacherBroadcastPayload,
    TeamRoundData
} from '../types';
import {addConnectionListener, createMonitoredChannel, supabase} from '../lib/supabase';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure';
import {AlertTriangle, CheckCircle, Hourglass, Smartphone} from 'lucide-react';
import Modal from '../components/UI/Modal';

const CompanyDisplayPage: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(localStorage.getItem(`ron_teamId_${sessionId}`));
    const [loggedInTeamName, setLoggedInTeamName] = useState<string | null>(localStorage.getItem(`ron_teamName_${sessionId}`));
    const [currentTeamKpis, setCurrentTeamKpis] = useState<TeamRoundData | null>(null);
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null);
    const [currentActivePhase, setCurrentActivePhase] = useState<GamePhaseNode | null>(null);
    const [isStudentDecisionTime, setIsStudentDecisionTime] = useState<boolean>(false);
    const [decisionPhaseTimerEndTime, setDecisionPhaseTimerEndTime] = useState<number | undefined>(undefined);
    const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | undefined>(undefined);
    const [decisionOptionsKey, setDecisionOptionsKey] = useState<string | undefined>(undefined);
    const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
    const [isSubmissionFeedbackModalOpen, setIsSubmissionFeedbackModalOpen] = useState(false);
    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);
    const submissionStatusRef = useRef(submissionStatus);
    const isStudentDecisionTimeRef = useRef(isStudentDecisionTime);
    const currentActivePhaseRef = useRef<GamePhaseNode | null>(null);
    const currentTeamKpisRef = useRef<TeamRoundData | null>(null);
    const decisionPhaseTimerEndTimeRef = useRef<number | undefined>(undefined);

    // Check if we're on mobile/tablet
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android.*(?:(?!Mobile)|(?=.*Tablet))|KFAPWI/i.test(navigator.userAgent);

    const [supabaseConnectionStatus, setSupabaseConnectionStatus] = useState<string>('disconnected');

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
        submissionStatusRef.current = submissionStatus;
    }, [submissionStatus]);

    useEffect(() => {
        isStudentDecisionTimeRef.current = isStudentDecisionTime;
    }, [isStudentDecisionTime]);

    useEffect(() => {
        currentActivePhaseRef.current = currentActivePhase;
    }, [currentActivePhase]);

    useEffect(() => {
        currentTeamKpisRef.current = currentTeamKpis;
    }, [currentTeamKpis]);

    useEffect(() => {
        decisionPhaseTimerEndTimeRef.current = decisionPhaseTimerEndTime;
    }, [decisionPhaseTimerEndTime]);

    // FIXED: More robust connection monitoring
    useEffect(() => {
        let connectionCleanup: (() => void) | null = null;

        try {
            connectionCleanup = addConnectionListener((status) => {
                console.log(`[CompanyDisplayPage] Supabase connection status: ${status}`);
                setSupabaseConnectionStatus(status);

                // Only set error if we have a persistent disconnection
                if (status === 'error') {
                    // Don't immediately show error - wait a bit to see if it recovers
                    setTimeout(() => {
                        if (supabaseConnectionStatus === 'error') {
                            setPageError("Connection to game server lost. Please refresh the page.");
                        }
                    }, 5000); // Wait 5 seconds before showing error
                } else if (status === 'connected') {
                    // Clear any existing error when we reconnect
                    setPageError(null);
                }
            });
        } catch (err) {
            console.warn('[CompanyDisplayPage] Connection listener setup failed:', err);
            // Don't set page error for connection listener setup failure
        }

        return () => {
            if (connectionCleanup) {
                connectionCleanup();
            }
        };
    }, []); // Remove supabaseConnectionStatus from dependencies to prevent loops

    const fetchInitialTeamData = useCallback(async (teamId: string, activePhase: GamePhaseNode | null) => {
        if (!sessionId || !activePhase || !teamId) {
            setCurrentTeamKpis(null);
            setIsLoadingData(false);
            return;
        }

        console.log(`[CompanyDisplayPage] Fetching initial data for team ${teamId}, phase ${activePhase.id}, round ${activePhase.round_number}`);
        setIsLoadingData(true);
        // Don't clear existing errors immediately - let them persist unless we have a new error

        try {
            // Fetch current KPIs using RPC
            if (activePhase.round_number > 0) {
                const { data: kpiData, error: kpiError } = await supabase
                    .rpc('get_team_kpis_for_student', {
                        target_session_id: sessionId,
                        target_team_id: teamId,
                        target_round_number: activePhase.round_number
                    });

                if (kpiError) {
                    console.error("Error fetching KPIs via RPC:", kpiError);
                    throw kpiError;
                }
                setCurrentTeamKpis(kpiData && kpiData.length > 0 ? kpiData[0] as TeamRoundData : null);
            } else {
                setCurrentTeamKpis(null);
            }

            // Check for existing submission for this phase using RPC
            if (activePhase.is_interactive_student_phase) {
                const { data: existingDecisionData, error: decisionError } = await supabase
                    .rpc('get_student_team_decision_for_phase', {
                        target_session_id: sessionId,
                        target_team_id: teamId,
                        target_phase_id: activePhase.id
                    });

                if (decisionError) {
                    console.error("Error fetching existing decision via RPC:", decisionError);
                    throw decisionError;
                }

                const existingDecision = existingDecisionData && existingDecisionData.length > 0 ? existingDecisionData[0] : null;

                if (existingDecision?.submitted_at) {
                    setSubmissionStatus('success');
                    submissionStatusRef.current = 'success';
                    setSubmissionMessage(`Decisions for "${activePhase.label}" were already submitted.`);
                    setIsStudentDecisionTime(false);
                    isStudentDecisionTimeRef.current = false;
                } else {
                    setSubmissionStatus('idle');
                    submissionStatusRef.current = 'idle';
                    setSubmissionMessage(null);
                }
            } else {
                setSubmissionStatus('idle');
                submissionStatusRef.current = 'idle';
                setSubmissionMessage(null);
            }

            // Clear any previous data fetch errors if this succeeds
            if (pageError && pageError.includes("Failed to load your team's data")) {
                setPageError(null);
            }
        } catch (err) {
            console.error("[CompanyDisplayPage] Error fetching initial team data (RPC):", err);
            setPageError("Failed to load your team's data. Please check your connection or contact the facilitator.");
        } finally {
            setIsLoadingData(false);
        }
    }, [sessionId, pageError]);

    useEffect(() => {
        if (!sessionId) {
            setPageError("No game session ID found in the URL.");
            return;
        }

        const realtimeChannelName = `teacher-updates-${sessionId}`;
        console.log(`[CompanyDisplayPage] Subscribing to Supabase real-time: ${realtimeChannelName}`);

        let realtimeChannel: any = null;

        try {
            realtimeChannel = createMonitoredChannel(realtimeChannelName);

            realtimeChannel.on('broadcast', { event: 'teacher_state_update' }, (payload: any) => {
                console.log(`[CompanyDisplayPage] Received teacher broadcast:`, payload.payload);

                const teacherPayload = payload.payload as TeacherBroadcastPayload;
                const newPhaseNode = teacherPayload.currentPhaseId ? gameStructure.allPhases.find(p => p.id === teacherPayload.currentPhaseId) || null : null;
                const newSlide = teacherPayload.currentSlideId !== null ? gameStructure.slides.find(s => s.id === teacherPayload.currentSlideId) || null : null;

                // Update state immediately
                setCurrentActivePhase(newPhaseNode);
                setCurrentActiveSlide(newSlide);
                setDecisionOptionsKey(teacherPayload.decisionOptionsKey);

                // Decision activation logic
                const shouldActivateDecisions = teacherPayload.isStudentDecisionPhaseActive &&
                    loggedInTeamId &&
                    newPhaseNode?.is_interactive_student_phase &&
                    (newSlide?.type === 'interactive_invest' ||
                        newSlide?.type === 'interactive_choice' ||
                        newSlide?.type === 'interactive_double_down_prompt' ||
                        newSlide?.type === 'interactive_double_down_select') &&
                    submissionStatusRef.current !== 'success';

                if (shouldActivateDecisions) {
                    console.log(`[CompanyDisplayPage] ACTIVATING decision time for phase ${newPhaseNode?.id}, slide ${newSlide?.id}`);
                    setIsStudentDecisionTime(true);
                    isStudentDecisionTimeRef.current = true;

                    if (submissionStatusRef.current !== 'idle') {
                        setSubmissionStatus('idle');
                        submissionStatusRef.current = 'idle';
                        setSubmissionMessage(null);
                    }
                } else if (!teacherPayload.isStudentDecisionPhaseActive) {
                    console.log(`[CompanyDisplayPage] DEACTIVATING decision time - broadcast says not active`);
                    setIsStudentDecisionTime(false);
                    isStudentDecisionTimeRef.current = false;
                }

                // Handle timer
                if (teacherPayload.decisionPhaseTimerEndTime !== decisionPhaseTimerEndTimeRef.current) {
                    setDecisionPhaseTimerEndTime(teacherPayload.decisionPhaseTimerEndTime);
                }

                // Handle phase changes for data fetching
                if (loggedInTeamId && newPhaseNode && newPhaseNode.id !== currentActivePhaseRef.current?.id) {
                    console.log(`[CompanyDisplayPage] Phase changed, fetching data for ${newPhaseNode.id}`);
                    fetchInitialTeamData(loggedInTeamId, newPhaseNode);
                }

                // Handle KPI updates for round changes
                if (loggedInTeamId && newPhaseNode && newPhaseNode.round_number > 0) {
                    if (currentTeamKpisRef.current?.round_number !== newPhaseNode.round_number || !currentTeamKpisRef.current) {
                        if (newPhaseNode.id !== currentActivePhaseRef.current?.id) {
                            fetchInitialTeamData(loggedInTeamId, newPhaseNode);
                        }
                    }
                } else if (newPhaseNode?.round_number === 0) {
                    setCurrentTeamKpis(null);
                }
            });

            realtimeChannel.subscribe((status: string) => {
                console.log(`[CompanyDisplayPage] Subscription status: ${status}`);
                if (status === 'SUBSCRIBED') {
                    console.log(`[CompanyDisplayPage] Successfully subscribed to real-time updates`);
                    // Clear connection errors when successfully subscribed
                    if (pageError && pageError.includes("Lost connection to game updates")) {
                        setPageError(null);
                    }
                } else if (status === 'CLOSED') {
                    console.log(`[CompanyDisplayPage] Real-time subscription closed`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error(`[CompanyDisplayPage] Real-time subscription error`);
                    // Don't immediately set error - wait to see if it recovers
                    setTimeout(() => {
                        setPageError("Lost connection to game updates. Please refresh the page.");
                    }, 3000);
                }
            });
        } catch (err) {
            console.error(`[CompanyDisplayPage] Error setting up real-time subscription:`, err);
            // Only set error if it's a critical setup failure
            setPageError("Failed to connect to game updates. Please refresh the page.");
        }

        return () => {
            console.log(`[CompanyDisplayPage] Cleaning up Supabase real-time subscription`);
            if (realtimeChannel && realtimeChannel.unsubscribe) {
                try {
                    realtimeChannel.unsubscribe();
                } catch (err) {
                    console.warn('[CompanyDisplayPage] Error unsubscribing from channel:', err);
                }
            }
        };
    }, [sessionId, gameStructure, fetchInitialTeamData, loggedInTeamId, pageError]);

    // Rest of the component remains the same...
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

    useEffect(() => {
        if (isStudentDecisionTimeRef.current && timeRemainingSeconds === 0 &&
            currentActivePhase?.phase_type === 'choice' &&
            submissionStatusRef.current !== 'success' &&
            submissionStatusRef.current !== 'submitting') {

            console.log(`[CompanyDisplayPage] Timer ended for CHOICE phase ${currentActivePhase.id}. Auto-submitting default.`);

            const optionsKey = decisionOptionsKey || currentActivePhase.id;
            const options = gameStructure.all_challenge_options[optionsKey] || [];
            const defaultOption = options.find(opt => opt.is_default_choice) || (options.length > 0 ? options[options.length-1] : null);

            if (defaultOption && loggedInTeamId && sessionId && currentActivePhase) {
                setSubmissionStatus('submitting');
                submissionStatusRef.current = 'submitting';
                setSubmissionMessage('Time is up! Submitting the default choice...');
                setIsSubmissionFeedbackModalOpen(true);

                const decisionData = {
                    session_id: sessionId,
                    team_id: loggedInTeamId,
                    phase_id: currentActivePhase.id,
                    round_number: currentActivePhase.round_number as 0 | 1 | 2 | 3,
                    selected_challenge_option_id: defaultOption.id,
                    submitted_at: new Date().toISOString(),
                };
                supabase.from('team_decisions').insert(decisionData)
                    .then(({ error }) => {
                        if (error) {
                            throw error;
                        }
                        setSubmissionStatus('success');
                        setSubmissionMessage(`Time's up! Default choice "${defaultOption.text.substring(0,20)}..." submitted.`);
                        setIsStudentDecisionTime(false);
                        setTimeRemainingSeconds(undefined);
                        setTimeout(() => setIsSubmissionFeedbackModalOpen(false), 3000);
                    })
                    .catch(err => {
                        console.error("[CompanyDisplayPage] Auto-submit error:", err);
                        setSubmissionStatus('error');
                        setSubmissionMessage("Failed to auto-submit default choice. Please inform your facilitator.");
                    });
            }
        }
    }, [timeRemainingSeconds, currentActivePhase, gameStructure, decisionOptionsKey, loggedInTeamId, sessionId]);

    useEffect(() => {
        if (loggedInTeamId && currentActivePhase) {
            fetchInitialTeamData(loggedInTeamId, currentActivePhase);
        }
    }, [loggedInTeamId, currentActivePhase, fetchInitialTeamData]);

    const handleLoginSuccess = (teamId: string, teamName: string) => {
        localStorage.setItem(`ron_teamId_${sessionId}`, teamId);
        localStorage.setItem(`ron_teamName_${sessionId}`, teamName);
        setLoggedInTeamId(teamId);
        setLoggedInTeamName(teamName);
        setPageError(null);
        setIsLoadingData(true);
    };

    // handleDecisionSubmit and other methods remain exactly the same...
    const handleDecisionSubmit = async (decisionDataPayload: any) => {
        console.log('[CompanyDisplayPage] === DECISION SUBMIT START ===');
        console.log('[CompanyDisplayPage] sessionId:', sessionId);
        console.log('[CompanyDisplayPage] loggedInTeamId:', loggedInTeamId);
        console.log('[CompanyDisplayPage] currentActivePhase:', currentActivePhase);
        console.log('[CompanyDisplayPage] decisionDataPayload:', decisionDataPayload);

        if (!sessionId || !loggedInTeamId || !currentActivePhase) {
            const missingItems = [];
            if (!sessionId) missingItems.push('sessionId');
            if (!loggedInTeamId) missingItems.push('loggedInTeamId');
            if (!currentActivePhase) missingItems.push('currentActivePhase');

            console.error('[CompanyDisplayPage] Missing required data:', missingItems);
            setSubmissionStatus('error');
            setSubmissionMessage(`Cannot submit: Missing ${missingItems.join(', ')}`);
            setIsSubmissionFeedbackModalOpen(true);
            return;
        }

        setSubmissionStatus('submitting');
        submissionStatusRef.current = 'submitting';
        setSubmissionMessage(`Submitting decisions for ${currentActivePhase.label}...`);
        setIsSubmissionFeedbackModalOpen(true);

        const submissionPayload = {
            ...decisionDataPayload,
            session_id: sessionId,
            team_id: loggedInTeamId,
            phase_id: currentActivePhase.id,
            round_number: currentActivePhase.round_number as 0 | 1 | 2 | 3,
            submitted_at: new Date().toISOString(),
        };

        console.log('[CompanyDisplayPage] === SUBMITTING TO SUPABASE ===');
        console.log('[CompanyDisplayPage] Full payload:', JSON.stringify(submissionPayload, null, 2));

        try {
            console.log('[CompanyDisplayPage] Attempting insert...');

            const { data, error, status, statusText } = await supabase
                .from('team_decisions')
                .insert(submissionPayload);

            console.log('[CompanyDisplayPage] Supabase response:', {
                data,
                error,
                status,
                statusText
            });

            if (error) {
                console.error('[CompanyDisplayPage] Supabase error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw error;
            }

            console.log('[CompanyDisplayPage] === SUBMISSION SUCCESSFUL ===');
            console.log('[CompanyDisplayPage] Response data:', data);

            setSubmissionStatus('success');
            submissionStatusRef.current = 'success';
            setSubmissionMessage(`Decisions for ${currentActivePhase.label} submitted successfully!`);
            setIsStudentDecisionTime(false);
            isStudentDecisionTimeRef.current = false;
            setTimeRemainingSeconds(undefined);
            setDecisionPhaseTimerEndTime(undefined);

            setTimeout(() => {
                setIsSubmissionFeedbackModalOpen(false);
            }, 3000);

        } catch (err) {
            console.error('[CompanyDisplayPage] === SUBMISSION FAILED ===');
            console.error('[CompanyDisplayPage] Error details:', err);

            setSubmissionStatus('error');
            submissionStatusRef.current = 'error';

            let errorMessage = "Failed to submit decisions.";
            if (err instanceof Error) {
                errorMessage = `Error: ${err.message}`;
            } else if (typeof err === 'object' && err !== null) {
                errorMessage = `Error: ${JSON.stringify(err)}`;
            }

            setSubmissionMessage(errorMessage);
        }
    };

    // Rest of component logic remains exactly the same...
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
        <div className={`min-h-screen bg-gray-900 text-white flex flex-col ${isMobile || isTablet ? 'touch-manipulation' : ''}`}
             style={{ minHeight: '100vh', minHeight: '100dvh' }}>

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
                        {isLoadingData || !currentActivePhase ? (
                            <div className="flex-1 flex items-center justify-center text-center text-gray-400 py-12">
                                <div>
                                    <Hourglass size={40} className="mx-auto mb-4 animate-pulse"/>
                                    <p className="text-lg">
                                        {isLoadingData && currentActivePhase ? `Loading data for ${currentActivePhase.label}...` :
                                            !currentActivePhase ? "Waiting for game to start..." :
                                                "Loading..."}
                                    </p>
                                </div>
                            </div>
                        ) : isStudentDecisionTimeRef.current && currentActivePhase && submissionStatusRef.current !== 'success' ? (
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

                                            {submissionStatusRef.current === 'success' && (
                                                <div className="mt-6 p-4 bg-green-900/50 rounded-lg border border-green-700">
                                                    <p className="text-green-400 flex items-center justify-center">
                                                        <CheckCircle size={20} className="mr-2"/>
                                                        Decisions submitted for {currentActivePhase?.label || "previous phase"}.
                                                        Waiting for facilitator.
                                                    </p>
                                                </div>
                                            )}
                                            {(submissionStatusRef.current !== 'success' && !isStudentDecisionTimeRef.current) && (
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
                                                {submissionStatusRef.current === 'success' && submissionMessage ?
                                                    submissionMessage :
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
                            <div className="h-4 flex-shrink-0" style={{ height: 'env(safe-area-inset-bottom, 1rem)' }}></div>
                        )}
                    </div>
                </div>
            </div>

            {/* Submission Feedback Modal */}
            {isSubmissionFeedbackModalOpen && (
                <Modal
                    isOpen={isSubmissionFeedbackModalOpen}
                    onClose={() => {
                        setIsSubmissionFeedbackModalOpen(false);
                        if(submissionStatus === 'error') setSubmissionMessage(null);
                    }}
                    title={
                        submissionStatus === 'submitting' ? "Processing Submission..." :
                            submissionStatus === 'success' ? "Submission Confirmed!" :
                                submissionStatus === 'error' ? "Submission Problem" :
                                    "Decision Status"
                    }
                    size="sm"
                >
                    <div className="p-2 text-center">
                        {submissionStatus === 'submitting' && <Hourglass size={32} className="mx-auto mb-3 text-blue-500 animate-pulse" />}
                        {submissionStatus === 'success' && <CheckCircle size={32} className="mx-auto mb-3 text-green-500" />}
                        {submissionStatus === 'error' && <AlertTriangle size={32} className="mx-auto mb-3 text-red-500" />}
                        <p className={`text-sm ${submissionStatus === 'error' ? 'text-red-700' : 'text-gray-700'}`}>
                            {submissionMessage || "Updating..."}
                        </p>

                        {(submissionStatus === 'success' || submissionStatus === 'error') && (
                            <button
                                onClick={() => {
                                    setIsSubmissionFeedbackModalOpen(false);
                                    if(submissionStatus === 'error') setSubmissionMessage(null);
                                }}
                                className="mt-5 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                                OK
                            </button>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CompanyDisplayPage;