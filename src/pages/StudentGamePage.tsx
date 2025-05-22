// src/pages/StudentGamePage.tsx
import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {useParams} from 'react-router-dom';
import TeamLogin from '../components/StudentGame/TeamLogin';
import KpiDisplay from '../components/StudentGame/KpiDisplay';
import DecisionPanel from '../components/StudentGame/DecisionPanel';
// SlideRenderer is not typically used directly on StudentGamePage, content comes via DecisionPanel/KPIs
// import SlideRenderer from '../components/StudentDisplay/SlideRenderer';
import {
    TeamRoundData,
    Slide, // Slide type might be useful for context, but not for direct rendering here
    GamePhaseNode,
    TeamDecision, // For type checking existing decisions
    TeacherBroadcastPayload,
    InvestmentOption,
    ChallengeOption
} from '../types';
import {supabase} from '../lib/supabase';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure';
import {Hourglass, CheckCircle, AlertTriangle} from 'lucide-react';
import Modal from '../components/UI/Modal'; // Assuming generic Modal

const StudentGamePage: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(localStorage.getItem(`ron_teamId_${sessionId}`));
    const [loggedInTeamName, setLoggedInTeamName] = useState<string | null>(localStorage.getItem(`ron_teamName_${sessionId}`));

    const [currentTeamKpis, setCurrentTeamKpis] = useState<TeamRoundData | null>(null);
    const [currentActiveSlide, setCurrentActiveSlide] = useState<Slide | null>(null); // Slide from teacher
    const [currentActivePhase, setCurrentActivePhase] = useState<GamePhaseNode | null>(null);

    const [isStudentDecisionTime, setIsStudentDecisionTime] = useState<boolean>(false);
    const [decisionPhaseTimerEndTime, setDecisionPhaseTimerEndTime] = useState<number | undefined>(undefined);
    const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | undefined>(undefined);

    const [decisionOptionsKey, setDecisionOptionsKey] = useState<string | undefined>(undefined);

    const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
    const [pageError, setPageError] = useState<string | null>(null);

    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
    const [isSubmissionFeedbackModalOpen, setIsSubmissionFeedbackModalOpen] = useState(false);


    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

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
            // Fetch current KPIs if in a round
            if (activePhase.round_number > 0) {
                const {data: kpiData, error: kpiError} = await supabase
                    .from('team_round_data')
                    .select('*')
                    .eq('session_id', sessionId)
                    .eq('team_id', teamId)
                    .eq('round_number', activePhase.round_number)
                    .single();
                if (kpiError && kpiError.code !== 'PGRST116') throw kpiError; // PGRST116 = no rows, ok if first time
                setCurrentTeamKpis(kpiData as TeamRoundData | null);
            } else {
                setCurrentTeamKpis(null); // No KPIs for welcome/setup phases
            }

            // Check for existing submission for this phase
            if (activePhase.is_interactive_student_phase) {
                const {data: existingDecision, error: decisionError} = await supabase
                    .from('team_decisions')
                    .select('id, submitted_at')
                    .eq('session_id', sessionId)
                    .eq('team_id', teamId)
                    .eq('phase_id', activePhase.id)
                    .single();

                if (decisionError && decisionError.code !== 'PGRST116') throw decisionError;

                if (existingDecision?.submitted_at) {
                    setSubmissionStatus('success');
                    setSubmissionMessage(`Decisions for "${activePhase.label}" were already submitted.`);
                    setIsStudentDecisionTime(false);
                } else {
                    // Reset for a new interactive phase if no prior submission
                    setSubmissionStatus('idle');
                    setSubmissionMessage(null);
                }
            } else {
                setSubmissionStatus('idle'); // Not an interactive phase
                setSubmissionMessage(null);
            }
        } catch (err) {
            console.error("[StudentGamePage] Error fetching initial team data:", err);
            setPageError("Failed to load your team's data. Please try refreshing.");
        } finally {
            setIsLoadingData(false);
        }
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) {
            setPageError("No game session ID found in the URL.");
            return;
        }
        console.log(`[StudentGamePage] Setting up BroadcastChannel for session: ${sessionId}`);
        const channel = new BroadcastChannel(`classroom-${sessionId}`);
        let timerInterval: NodeJS.Timeout | undefined;

        channel.onmessage = (event) => {
            if (event.data.type === 'TEACHER_STATE_UPDATE') {
                const payload = event.data.payload as TeacherBroadcastPayload;
                // console.log('[StudentGamePage] Received TEACHER_STATE_UPDATE:', payload);

                const newPhaseNode = payload.currentPhaseId ? gameStructure.allPhases.find(p => p.id === payload.currentPhaseId) || null : null;
                const newSlide = payload.currentSlideId !== null ? gameStructure.slides.find(s => s.id === payload.currentSlideId) || null : null;

                const previousPhaseId = currentActivePhase?.id;
                setCurrentActivePhase(newPhaseNode);
                setCurrentActiveSlide(newSlide);
                setDecisionOptionsKey(payload.decisionOptionsKey);

                const decisionPhaseNowActive = payload.isStudentDecisionPhaseActive || false;

                // If phase changes, fetch initial data (KPIs, check existing submission)
                if (loggedInTeamId && newPhaseNode && newPhaseNode.id !== previousPhaseId) {
                    fetchInitialTeamData(loggedInTeamId, newPhaseNode);
                }

                // This logic now needs to be careful not to override submissionStatus if fetchInitialTeamData found a submission
                // setIsStudentDecisionTime is set *after* fetchInitialTeamData potentially modifies submissionStatus
                if (newPhaseNode && newPhaseNode.id !== previousPhaseId) {
                    // If it's a new phase, rely on fetchInitialTeamData to set submission status, then decide if it's decision time
                    fetchInitialTeamData(loggedInTeamId!, newPhaseNode).then(() => {
                        // This check is now inside the .then()
                        if (decisionPhaseNowActive && submissionStatusRef.current !== 'success') {
                            setIsStudentDecisionTime(true);
                        } else {
                            setIsStudentDecisionTime(false);
                        }
                    });
                } else if (decisionPhaseNowActive && submissionStatusRef.current !== 'success') { // Same phase, but not yet submitted
                    setIsStudentDecisionTime(true);
                } else { // Not decision time or already submitted
                    setIsStudentDecisionTime(false);
                }


                if (decisionPhaseNowActive && payload.decisionPhaseTimerEndTime) {
                    setDecisionPhaseTimerEndTime(payload.decisionPhaseTimerEndTime);
                    const now = Date.now();
                    const remaining = Math.max(0, Math.round((payload.decisionPhaseTimerEndTime - now) / 1000));
                    setTimeRemainingSeconds(remaining);

                    if (timerInterval) clearInterval(timerInterval);
                    if (remaining > 0) {
                        timerInterval = setInterval(() => {
                            const currentRemaining = Math.max(0, Math.round((payload.decisionPhaseTimerEndTime! - Date.now()) / 1000));
                            setTimeRemainingSeconds(currentRemaining);
                            if (currentRemaining <= 0) {
                                clearInterval(timerInterval);
                                // Auto-submit logic is handled in a separate useEffect watching timeRemainingSeconds
                            }
                        }, 1000);
                    }
                } else {
                    setDecisionPhaseTimerEndTime(undefined);
                    setTimeRemainingSeconds(undefined);
                    if (timerInterval) clearInterval(timerInterval);
                }
            }
        };
        return () => {
            console.log(`[StudentGamePage] Closing BroadcastChannel for session: ${sessionId}`);
            channel.close();
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [sessionId, gameStructure, fetchInitialTeamData, loggedInTeamId]);

    // Ref for submissionStatus to use in broadcast onmessage
    const submissionStatusRef = React.useRef(submissionStatus);
    useEffect(() => {
        submissionStatusRef.current = submissionStatus;
    }, [submissionStatus]);

    // Auto-submit for choice phases when timer runs out
    useEffect(() => {
        if (isStudentDecisionTime && timeRemainingSeconds === 0 &&
            currentActivePhase?.phase_type === 'choice' &&
            submissionStatusRef.current !== 'success' && // Use ref here
            submissionStatusRef.current !== 'submitting') {

            console.log(`[StudentGamePage] Timer ended for CHOICE phase ${currentActivePhase.id}. Auto-submitting default.`);

            const options = gameStructure.all_challenge_options[decisionOptionsKey || currentActivePhase.id] || [];
            const defaultOption = options.find(opt => opt.is_default_choice) || (options.length > 0 ? options[options.length-1] : null);

            if (defaultOption && loggedInTeamId && sessionId && currentActivePhase) {
                setSubmissionStatus('submitting');
                setSubmissionMessage('Time up! Submitting default choice...');
                setIsSubmissionFeedbackModalOpen(true);

                const decisionData = {
                    session_id: sessionId,
                    team_id: loggedInTeamId,
                    phase_id: currentActivePhase.id,
                    round_number: currentActivePhase.round_number,
                    selected_challenge_option_id: defaultOption.id,
                    submitted_at: new Date().toISOString(),
                };
                supabase.from('team_decisions').insert(decisionData)
                    .then(({ error }) => {
                        if (error) {
                            throw error;
                        }
                        setSubmissionStatus('success');
                        setSubmissionMessage(`Time's up! Default choice (${defaultOption.text.substring(0,20)}...) submitted.`);
                        setIsStudentDecisionTime(false);
                        setTimeRemainingSeconds(undefined);
                    })
                    .catch(err => {
                        console.error("[StudentGamePage] Auto-submit error:", err);
                        setSubmissionStatus('error');
                        setSubmissionMessage("Failed to auto-submit default choice. Please inform your facilitator.");
                    });
            }
        }
    }, [timeRemainingSeconds, isStudentDecisionTime, currentActivePhase, gameStructure, decisionOptionsKey, loggedInTeamId, sessionId]);


    useEffect(() => {
        if (loggedInTeamId && currentActivePhase) {
            fetchInitialTeamData(loggedInTeamId, currentActivePhase);
        }
    }, [loggedInTeamId]); // Re-fetch if loggedInTeamId changes (after login)

    const handleLoginSuccess = (teamId: string, teamName: string) => {
        localStorage.setItem(`ron_teamId_${sessionId}`, teamId);
        localStorage.setItem(`ron_teamName_${sessionId}`, teamName);
        setLoggedInTeamId(teamId);
        setLoggedInTeamName(teamName);
        setPageError(null);
        // fetchInitialTeamData will be called by the effect watching loggedInTeamId if currentActivePhase is set
        // Or, if currentActivePhase is not yet set (e.g. page just loaded), we might need an initial fetch here
        // or ensure the broadcast listener fetches once loggedInTeamId is available.
        // The current broadcast listener effect should handle fetching when new phase data arrives post-login.
    };

    const handleDecisionSubmit = async (decisionDataPayload: any) => {
        if (!sessionId || !loggedInTeamId || !currentActivePhase) {
            setSubmissionStatus('error');
            setSubmissionMessage("Cannot submit: Critical information missing.");
            setIsSubmissionFeedbackModalOpen(true);
            return;
        }

        setSubmissionStatus('submitting');
        setSubmissionMessage(`Submitting decisions for ${currentActivePhase.label}...`);
        setIsSubmissionFeedbackModalOpen(true);

        const submissionPayload = {
            ...decisionDataPayload, // This comes from DecisionPanel
            session_id: sessionId,
            team_id: loggedInTeamId,
            phase_id: currentActivePhase.id,
            round_number: currentActivePhase.round_number,
            submitted_at: new Date().toISOString(),
        };

        try {
            const {error} = await supabase.from('team_decisions').insert(submissionPayload);
            if (error) throw error;

            setSubmissionStatus('success');
            setSubmissionMessage(`Decisions for ${currentActivePhase.label} submitted successfully! Waiting for facilitator.`);
            setIsStudentDecisionTime(false); // Turn off decision panel locally
            setTimeRemainingSeconds(undefined); // Clear timer
            // KPIs will be updated via broadcast when teacher processes and advances
        } catch (err) {
            console.error("[StudentGamePage] Error submitting decision:", err);
            setSubmissionStatus('error');
            setSubmissionMessage(err instanceof Error ? `Submission Error: ${err.message}` : "Failed to submit decisions. Please try again or notify facilitator.");
        }
        // Keep modal open for success/error feedback for a bit
        // setTimeout(() => setIsSubmissionFeedbackModalOpen(false), submissionStatus === 'success' ? 3000 : 5000);
        // Better to let user close error, auto-close success via another timer if needed
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
            const rd3InvestPhaseId = `rd3-invest`; // Key for RD3 investment options
            // Ideally, filter by what the team actually invested in RD3
            // This requires fetching and using team's RD3 decision
            // For now, showing all RD3 options as a placeholder:
            return gameStructure.all_investment_options[rd3InvestPhaseId] || [];
        }
        return [];
    }, [currentActivePhase, gameStructure, loggedInTeamId]);


    if (pageError) {
        return (
            <div className="min-h-screen bg-red-900 text-white flex flex-col items-center justify-center p-4">
                <AlertTriangle size={48} className="mb-4 text-yellow-300"/>
                <h1 className="text-2xl font-bold mb-2">Connection Error</h1>
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
        return <div className="min-h-screen bg-gray-800 text-white flex items-center justify-center p-4">Invalid session link.</div>;
    }

    if (!loggedInTeamId || !loggedInTeamName) {
        return <TeamLogin sessionId={sessionId} onLoginSuccess={handleLoginSuccess}/>;
    }

    const kpiRoundLabel = currentActivePhase?.round_number ? `RD-${currentActivePhase.round_number} Status` : "Pre-Game";
    const budgetForInvestPhase = currentActivePhase?.phase_type === 'invest' && decisionOptionsKey && gameStructure.investment_phase_budgets?.[decisionOptionsKey]
        ? gameStructure.investment_phase_budgets[decisionOptionsKey]
        : 0;

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
            {/* Always show KPIs if available for current round, or a placeholder */}
            <KpiDisplay
                teamName={loggedInTeamName}
                currentRoundLabel={kpiRoundLabel}
                kpis={currentTeamKpis}
            />

            <div className="flex-grow p-3 md:p-4 overflow-y-auto">
                {isLoadingData && (
                    <div className="text-center text-gray-400 py-10">
                        <Hourglass size={32} className="mx-auto mb-3 animate-pulse"/>
                        Loading team data...
                    </div>
                )}

                {!isLoadingData && isStudentDecisionTime && currentActivePhase && submissionStatus !== 'success' ? (
                    <DecisionPanel
                        sessionId={sessionId}
                        teamId={loggedInTeamId}
                        currentPhase={currentActivePhase}
                        investmentOptions={investmentOptionsForCurrentPhase}
                        investUpToBudget={budgetForInvestPhase}
                        challengeOptions={challengeOptionsForCurrentPhase}
                        availableRd3Investments={rd3InvestmentsForDoubleDown}
                        onDecisionSubmit={handleDecisionSubmit}
                        isDecisionTime={isStudentDecisionTime}
                        timeRemainingSeconds={timeRemainingSeconds}
                        // currentSpentBudgetForInvestments could be fetched if needed for resuming
                    />
                ) : !isLoadingData && currentActiveSlide ? (
                    // Passive view: Show a simplified version of the current slide from teacher
                    // This is NOT the main student display, just a small contextual view on their device.
                    <div className="text-center p-4 bg-gray-800 rounded-lg shadow-md max-w-xl mx-auto">
                        <h3 className="text-lg font-semibold text-sky-300 mb-2">{currentActiveSlide.title || "Current Activity"}</h3>
                        {currentActiveSlide.main_text && <p className="text-md text-gray-300 mb-1">{currentActiveSlide.main_text}</p>}
                        {currentActiveSlide.sub_text && <p className="text-sm text-gray-400">{currentActiveSlide.sub_text}</p>}
                        {submissionStatus === 'success' && submissionMessage &&
                            <p className="mt-3 text-sm text-green-400 flex items-center justify-center"><CheckCircle size={16} className="mr-1"/> {submissionMessage}</p>
                        }
                        {submissionStatus !== 'success' && !isStudentDecisionTime &&
                            <p className="mt-3 text-sm text-yellow-400 flex items-center justify-center"><Hourglass size={16} className="mr-1 animate-pulse"/> Waiting for facilitator...</p>
                        }
                    </div>
                ) : !isLoadingData && (
                    <div className="text-center text-gray-400 py-10">
                        <Hourglass size={32} className="mx-auto mb-3 animate-pulse"/>
                        {submissionStatus === 'success' && submissionMessage ? submissionMessage : "Waiting for facilitator to start next phase..."}
                    </div>
                )}
            </div>

            {isSubmissionFeedbackModalOpen && (
                <Modal
                    isOpen={isSubmissionFeedbackModalOpen}
                    onClose={() => setIsSubmissionFeedbackModalOpen(false)}
                    title={
                        submissionStatus === 'submitting' ? "Processing..." :
                            submissionStatus === 'success' ? "Submission Successful!" :
                                submissionStatus === 'error' ? "Submission Failed" :
                                    "Status"
                    }
                    size="sm"
                >
                    <div className="p-2 text-center">
                        {submissionStatus === 'submitting' && <Hourglass size={24} className="mx-auto mb-2 text-blue-500 animate-pulse" />}
                        {submissionStatus === 'success' && <CheckCircle size={24} className="mx-auto mb-2 text-green-500" />}
                        {submissionStatus === 'error' && <AlertTriangle size={24} className="mx-auto mb-2 text-red-500" />}
                        <p className={`text-sm ${submissionStatus === 'error' ? 'text-red-600' : 'text-gray-600'}`}>{submissionMessage || "Updating..."}</p>
                        {(submissionStatus === 'success' || submissionStatus === 'error') && (
                            <button
                                onClick={() => setIsSubmissionFeedbackModalOpen(false)}
                                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
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