// src/pages/StudentGamePage.tsx
import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {useParams} from 'react-router-dom';
import TeamLogin from '../components/StudentGame/TeamLogin';
import KpiDisplay from '../components/StudentGame/KpiDisplay';
import DecisionPanel from '../components/StudentGame/DecisionPanel';
import {
    TeamRoundData,
    Slide,
    GamePhaseNode,
    TeacherBroadcastPayload,
    InvestmentOption,
    ChallengeOption
} from '../types';
import {supabase} from '../lib/supabase';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure';
import {Hourglass, CheckCircle, AlertTriangle} from 'lucide-react';
import Modal from '../components/UI/Modal';

const StudentGamePage: React.FC = () => {
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

    useEffect(() => {
        submissionStatusRef.current = submissionStatus;
    }, [submissionStatus]);

    useEffect(() => {
        isStudentDecisionTimeRef.current = isStudentDecisionTime;
    }, [isStudentDecisionTime]);

    const fetchInitialTeamData = useCallback(async (teamId: string, activePhase: GamePhaseNode | null) => {
        if (!sessionId || !activePhase || !teamId) {
            setCurrentTeamKpis(null);
            setIsLoadingData(false);
            return;
        }

        console.log(`[StudentGamePage] Fetching initial data for team ${teamId}, phase ${activePhase.id}, round ${activePhase.round_number}`);
        setIsLoadingData(true);
        setPageError(null);

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
                    throw kpiError; // Let error boundary catch or handle specifically
                }
                // RPC 'data' for SETOF will be an array. Expecting one or zero rows.
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
        } catch (err) {
            console.error("[StudentGamePage] Error fetching initial team data (RPC):", err);
            setPageError("Failed to load your team's data. Please check your connection or contact the facilitator.");
        } finally {
            setIsLoadingData(false);
        }
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) {
            setPageError("No game session ID found in the URL.");
            return;
        }
        const channel = new BroadcastChannel(`classroom-${sessionId}`);
        let timerInterval: NodeJS.Timeout | undefined;

        channel.onmessage = (event) => {
            if (event.data.type === 'TEACHER_STATE_UPDATE') {
                const payload = event.data.payload as TeacherBroadcastPayload;

                const newPhaseNode = payload.currentPhaseId ? gameStructure.allPhases.find(p => p.id === payload.currentPhaseId) || null : null;
                const newSlide = payload.currentSlideId !== null ? gameStructure.slides.find(s => s.id === payload.currentSlideId) || null : null;

                const previousPhaseId = currentActivePhase?.id;
                setCurrentActivePhase(newPhaseNode);
                setCurrentActiveSlide(newSlide);
                setDecisionOptionsKey(payload.decisionOptionsKey);

                const decisionPhaseNowActive = payload.isStudentDecisionPhaseActive || false;

                if (loggedInTeamId && newPhaseNode && newPhaseNode.id !== previousPhaseId) {
                    fetchInitialTeamData(loggedInTeamId, newPhaseNode).then(() => {
                        if (decisionPhaseNowActive && submissionStatusRef.current !== 'success') {
                            setIsStudentDecisionTime(true);
                        } else {
                            setIsStudentDecisionTime(false);
                        }
                    });
                } else {
                    if (decisionPhaseNowActive && submissionStatusRef.current !== 'success') {
                        setIsStudentDecisionTime(true);
                    } else {
                        setIsStudentDecisionTime(false);
                    }
                }

                if (decisionPhaseTimerEndTime !== payload.decisionPhaseTimerEndTime) {
                    setDecisionPhaseTimerEndTime(payload.decisionPhaseTimerEndTime);
                }

                if (loggedInTeamId && newPhaseNode && newPhaseNode.round_number > 0) {
                    if (currentTeamKpis?.round_number !== newPhaseNode.round_number || !currentTeamKpis) {
                        if (newPhaseNode.id !== previousPhaseId) { // Only fetch if phase also changed, or KPIs are null
                            fetchInitialTeamData(loggedInTeamId, newPhaseNode);
                        }
                    }
                } else if (newPhaseNode?.round_number === 0) {
                    setCurrentTeamKpis(null);
                }
            }
        };
        return () => {
            channel.close();
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [sessionId, gameStructure, fetchInitialTeamData, loggedInTeamId, currentActivePhase, currentTeamKpis, decisionPhaseTimerEndTime]);

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

            console.log(`[StudentGamePage] Timer ended for CHOICE phase ${currentActivePhase.id}. Auto-submitting default.`);

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
                        console.error("[StudentGamePage] Auto-submit error:", err);
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
    }, [loggedInTeamId, currentActivePhase?.id, fetchInitialTeamData]);

    const handleLoginSuccess = (teamId: string, teamName: string) => {
        localStorage.setItem(`ron_teamId_${sessionId}`, teamId);
        localStorage.setItem(`ron_teamName_${sessionId}`, teamName);
        setLoggedInTeamId(teamId);
        setLoggedInTeamName(teamName);
        setPageError(null);
        setIsLoadingData(true);
    };

    const handleDecisionSubmit = async (decisionDataPayload: any) => {
        if (!sessionId || !loggedInTeamId || !currentActivePhase) {
            setSubmissionStatus('error');
            setSubmissionMessage("Cannot submit: Critical information missing (session, team, or phase).");
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

        try {
            const {error} = await supabase.from('team_decisions').insert(submissionPayload);
            if (error) throw error;

            setSubmissionStatus('success');
            submissionStatusRef.current = 'success';
            setSubmissionMessage(`Decisions for ${currentActivePhase.label} submitted successfully! Waiting for facilitator.`);
            setIsStudentDecisionTime(false);
            setTimeRemainingSeconds(undefined);
            setDecisionPhaseTimerEndTime(undefined);
            setTimeout(() => {
                setIsSubmissionFeedbackModalOpen(false);
            }, 3000);
        } catch (err) {
            console.error("[StudentGamePage] Error submitting decision:", err);
            setSubmissionStatus('error');
            submissionStatusRef.current = 'error';
            setSubmissionMessage(err instanceof Error ? `Submission Error: ${err.message}` : "Failed to submit decisions. Please try again or notify facilitator.");
        }
    };

    const investmentOptionsForCurrentPhase = useMemo((): InvestmentOption[] => {
        if (currentActivePhase?.phase_type === 'invest' && decisionOptionsKey && gameStructure) {
            return gameStructure.all_investment_options[decisionOptionsKey] || [];
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
                <h1 className="text-2xl font-bold mb-2">Application Error</h1>
                <p className="text-center mb-4">{pageError}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-yellow-400 text-red-900 font-semibold rounded hover:bg-yellow-300"
                >
                    Try Reloading Page
                </button>
            </div>
        );
    }

    if (!sessionId) {
        return <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">Error: Invalid session link. Please check the URL.</div>;
    }

    if (!loggedInTeamId || !loggedInTeamName) {
        return <TeamLogin sessionId={sessionId} onLoginSuccess={handleLoginSuccess}/>;
    }

    // Determine kpiRoundLabel safely, even if currentActivePhase is null initially
    const kpiRoundLabel = currentActivePhase?.round_number ?
        `RD-${currentActivePhase.round_number} ${currentActivePhase.phase_type === 'kpi' || currentActivePhase.phase_type === 'leaderboard' ? 'Final ' : ''}Status`
        : (loggedInTeamId ? "Connecting..." : "Game Setup"); // Show "Connecting" if logged in but no phase yet

    const budgetForInvestPhase = currentActivePhase?.phase_type === 'invest' && decisionOptionsKey && gameStructure.investment_phase_budgets?.[decisionOptionsKey]
        ? gameStructure.investment_phase_budgets[decisionOptionsKey]
        : 0;

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
            {/* KpiDisplay is ALWAYS rendered after login */}
            <KpiDisplay
                teamName={loggedInTeamName}
                currentRoundLabel={kpiRoundLabel}
                kpis={currentTeamKpis} // Will pass null initially, KpiDisplay handles defaults
            />

            <div className="flex-grow p-3 md:p-4 overflow-y-auto">
                {/* Show main loading if no active phase yet, or if explicitly loading data */}
                {isLoadingData || !currentActivePhase ? (
                    <div className="text-center text-gray-400 py-10">
                        <Hourglass size={32} className="mx-auto mb-3 animate-pulse"/>
                        <p>
                            {isLoadingData && currentActivePhase ? `Loading data for ${currentActivePhase.label}...` :
                                !currentActivePhase ? "Waiting for game to start..." :
                                    "Loading..."}
                        </p>
                    </div>
                ) : isStudentDecisionTimeRef.current && currentActivePhase && submissionStatusRef.current !== 'success' ? (
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
                ) : currentActiveSlide ? (
                    <div className="text-center p-4 bg-gray-800 rounded-lg shadow-md max-w-xl mx-auto my-4">
                        <h3 className="text-lg font-semibold text-sky-400 mb-2">{currentActiveSlide.title || currentActivePhase?.label || "Current Activity"}</h3>
                        {currentActiveSlide.main_text && <p className="text-md text-gray-200 mb-1">{currentActiveSlide.main_text}</p>}
                        {currentActiveSlide.sub_text && <p className="text-sm text-gray-300">{currentActiveSlide.sub_text}</p>}

                        {submissionStatusRef.current === 'success' && (
                            <p className="mt-4 text-sm text-green-400 flex items-center justify-center">
                                <CheckCircle size={18} className="mr-2"/> Decisions submitted for {currentActivePhase?.label || "previous phase"}. Waiting for facilitator.
                            </p>
                        )}
                        {(submissionStatusRef.current !== 'success' && !isStudentDecisionTimeRef.current) &&
                            <p className="mt-4 text-sm text-yellow-400 flex items-center justify-center">
                                <Hourglass size={18} className="mr-2 animate-pulse"/> Waiting for facilitator...
                            </p>
                        }
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-10">
                        <Hourglass size={32} className="mx-auto mb-3 animate-pulse"/>
                        {submissionStatusRef.current === 'success' && submissionMessage ? submissionMessage : `Waiting for facilitator to start ${currentActivePhase?.label || "next phase"}...`}
                    </div>
                )}
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
                        <p className={`text-sm ${submissionStatus === 'error' ? 'text-red-700' : 'text-gray-700'}`}>{submissionMessage || "Updating..."}</p>

                        {(submissionStatus === 'success' || submissionStatus === 'error') && (
                            <button
                                onClick={() => {
                                    setIsSubmissionFeedbackModalOpen(false);
                                    if(submissionStatus === 'error') setSubmissionMessage(null);
                                }}
                                className="mt-5 px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
export default StudentGamePage;