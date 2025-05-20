// src/pages/StudentGamePage.tsx
import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {useParams} from 'react-router-dom';
import TeamLogin from '../components/StudentGame/TeamLogin';
import KpiDisplay from '../components/StudentGame/KpiDisplay';
import DecisionPanel from '../components/StudentGame/DecisionPanel';
import SlideRenderer from '../components/StudentDisplay/SlideRenderer';
import {
    TeamRoundData,
    Slide,
    GamePhaseNode,
    TeamDecision,
    TeacherBroadcastPayload
} from '../types';
import {supabase} from '../lib/supabase';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure';
import {Hourglass} from 'lucide-react';

const StudentGamePage: React.FC = () => {
    const {sessionId} = useParams<{ sessionId: string }>();
    const [loggedInTeamId, setLoggedInTeamId] = useState<string | null>(localStorage.getItem(`ron_teamId_${sessionId}`));
    const [loggedInTeamName, setLoggedInTeamName] = useState<string | null>(localStorage.getItem(`ron_teamName_${sessionId}`));

    const [currentTeamKpis, setCurrentTeamKpis] = useState<TeamRoundData | null>(null);
    const [currentSlideForDisplay, setCurrentSlideForDisplay] = useState<Slide | null>(null);
    const [currentPhase, setCurrentPhase] = useState<GamePhaseNode | null>(null);

    const [isDecisionTime, setIsDecisionTime] = useState<boolean>(false);
    const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | undefined>(undefined);
    // decisionTimerEndTime is now managed internally by the countdown derived from broadcast

    const [isLoading, setIsLoading] = useState<boolean>(false); // For initial data fetching
    const [pageError, setPageError] = useState<string | null>(null); // For page-level errors
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);

    const gameStructure = useMemo(() => readyOrNotGame_2_0_DD, []);

    const fetchInitialTeamData = useCallback(async (teamId: string, activePhase: GamePhaseNode | null) => {
        if (!sessionId || !activePhase || activePhase.round_number === 0) {
            setCurrentTeamKpis(null);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            // Fetch current KPIs
            const {data: kpiData, error: kpiError} = await supabase
                .from('team_round_data')
                .select('*')
                .eq('session_id', sessionId)
                .eq('team_id', teamId)
                .eq('round_number', activePhase.round_number)
                .single();
            if (kpiError && kpiError.code !== 'PGRST116') throw kpiError;
            setCurrentTeamKpis(kpiData as TeamRoundData | null);

            // Check for existing submission for this phase
            if (activePhase.is_interactive_student_phase) {
                const {data: existingDecision, error: decisionError} = await supabase
                    .from('team_decisions')
                    .select('id, submitted_at') // Only need to know if it exists
                    .eq('session_id', sessionId)
                    .eq('team_id', teamId)
                    .eq('phase_id', activePhase.id)
                    .single();
                if (decisionError && decisionError.code !== 'PGRST116') throw decisionError;

                if (existingDecision?.submitted_at) {
                    setSubmissionStatus('success');
                    setSubmissionMessage("You've already submitted for this phase.");
                    setIsDecisionTime(false); // Override broadcast if already submitted
                } else {
                    // If no existing decision, ensure status is idle for a new interactive phase
                    setSubmissionStatus('idle');
                    setSubmissionMessage(null);
                }
            }
        } catch (err) {
            console.error("Error fetching initial team data:", err);
            setPageError("Failed to load your team's data. Please try refreshing or contact your facilitator.");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        const channel = new BroadcastChannel(`classroom-${sessionId}`);
        let timerInterval: NodeJS.Timeout | undefined;

        channel.onmessage = (event) => {
            if (event.data.type === 'TEACHER_STATE_UPDATE') {
                const payload = event.data.payload as TeacherBroadcastPayload;

                const newPhaseNode = payload.currentPhaseId ? gameStructure.allPhases.find(p => p.id === payload.currentPhaseId) || null : null;
                const newSlide = payload.currentSlideId !== null ? gameStructure.slides.find(s => s.id === payload.currentSlideId) || null : null;

                const previousPhaseId = currentPhase?.id;
                setCurrentPhase(newPhaseNode);
                setCurrentSlideForDisplay(newSlide);

                const decisionPhaseNowActive = payload.isStudentDecisionPhaseActive || false;

                // Only transition to decision time if not already submitted for this NEW phase
                if (decisionPhaseNowActive && newPhaseNode && newPhaseNode.id !== previousPhaseId) {
                    fetchInitialTeamData(loggedInTeamId!, newPhaseNode).then(() => {
                        // This callback runs after fetchInitialTeamData completes.
                        // Check submissionStatus again as it might have been updated by fetchInitialTeamData
                        if (submissionStatus !== 'success') { // Use the latest submissionStatus
                            setIsDecisionTime(true);
                        } else {
                            setIsDecisionTime(false); // Already submitted for this new phase
                        }
                    });
                } else if (decisionPhaseNowActive && submissionStatus !== 'success') {
                    setIsDecisionTime(true); // Keep decision time if same phase and not submitted
                } else {
                    setIsDecisionTime(false);
                }

                if (decisionPhaseNowActive && payload.decisionPhaseTimerEndTime) {
                    const now = Date.now();
                    const remaining = Math.max(0, Math.round((payload.decisionPhaseTimerEndTime - now) / 1000));
                    setTimeRemainingSeconds(remaining);

                    if (timerInterval) clearInterval(timerInterval);
                    if (remaining > 0) {
                        timerInterval = setInterval(() => {
                            const currentRemaining = Math.max(0, Math.round((payload.decisionPhaseTimerEndTime! - Date.now()) / 1000));
                            setTimeRemainingSeconds(currentRemaining);
                            if (currentRemaining <= 0) clearInterval(timerInterval);
                        }, 1000);
                    }
                } else {
                    setTimeRemainingSeconds(undefined);
                    if (timerInterval) clearInterval(timerInterval);
                }

                if (loggedInTeamId && newPhaseNode && newPhaseNode.round_number > 0) {
                    if (currentTeamKpis?.round_number !== newPhaseNode.round_number || !currentTeamKpis || newPhaseNode.id !== previousPhaseId) {
                        fetchInitialTeamData(loggedInTeamId, newPhaseNode);
                    }
                } else if (newPhaseNode?.round_number === 0) {
                    setCurrentTeamKpis(null);
                }

                if (newPhaseNode && newPhaseNode.id !== previousPhaseId && !decisionPhaseNowActive) {
                    setSubmissionStatus('idle');
                    setSubmissionMessage(null);
                }
            }
        };
        return () => {
            channel.close();
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [sessionId, gameStructure, fetchInitialTeamData, loggedInTeamId, currentTeamKpis, currentPhase, submissionStatus]);

    useEffect(() => {
        if (loggedInTeamId && currentPhase) {
            fetchInitialTeamData(loggedInTeamId, currentPhase);
        }
    }, [loggedInTeamId]); // Removed currentPhase, fetchInitialTeamData to avoid loop with its own update. This means initial fetch on login.

    const handleLoginSuccess = (teamId: string, teamName: string) => { /* ... same as before ... */
        localStorage.setItem(`ron_teamId_${sessionId}`, teamId);
        localStorage.setItem(`ron_teamName_${sessionId}`, teamName);
        setLoggedInTeamId(teamId);
        setLoggedInTeamName(teamName);
        setPageError(null);
        if (currentPhase) fetchInitialTeamData(teamId, currentPhase);
    };

    const handleDecisionSubmitSuccess = () => { /* ... same as before ... */
        setSubmissionStatus('success');
        setSubmissionMessage(`Decisions for ${currentPhase?.label || 'current phase'} submitted!`);
        setIsDecisionTime(false);
        setTimeRemainingSeconds(undefined);
        // KPIs will be updated when teacher advances and new data is broadcasted or fetched
        setTimeout(() => {
            setSubmissionMessage(null); /* Keep submissionStatus as 'success' until new phase */
        }, 5000);
    };

    const investmentOptionsForCurrentPhase = useMemo(() => { /* ... same as before ... */
        if (currentPhase?.phase_type === 'invest' && currentPhase.id && gameStructure) {
            const key = currentSlideForDisplay?.interactive_data_key || currentPhase.id;
            return gameStructure.all_investment_options[key] || [];
        }
        return [];
    }, [currentPhase, gameStructure, currentSlideForDisplay]);

    const challengeOptionsForCurrentPhase = useMemo(() => { /* ... same as before, using currentSlideForDisplay.interactive_data_key ... */
        if (currentPhase && (currentPhase.phase_type === 'choice' || currentPhase.phase_type === 'double-down-prompt') && gameStructure) {
            const key = currentSlideForDisplay?.interactive_data_key || currentPhase.id;
            if (currentPhase.phase_type === 'double-down-prompt') {
                return [
                    {id: "yes_dd", text: "Yes, I want to Double Down!", is_default_choice: false},
                    {id: "no_dd", text: "No, I'll stick with my current RD-3 investments.", is_default_choice: true}
                ];
            }
            return gameStructure.all_challenge_options[key] || [];
        }
        return [];
    }, [currentPhase, gameStructure, currentSlideForDisplay]);

    const rd3InvestmentsForDoubleDown = useMemo(() => { /* ... same as before, but fetch team decisions from Supabase if not in local state yet ... */
        // This part needs robust fetching of team's RD3 investments if not already loaded.
        // For simplicity, assuming `state.teamDecisions` (from AppContext, passed if needed, or fetched here)
        // has the data. In a real scenario, StudentGamePage might need its own `teamDecisions` state.
        if (loggedInTeamId && currentPhase?.phase_type === 'double-down-select' && gameStructure) {
            const rd3InvestPhaseId = `rd${currentPhase.round_number}-invest`;
            // This component doesn't have direct access to AppContext.state.teamDecisions.
            // It would need to fetch its own team's decisions or receive them.
            // For now, we'll use a placeholder and this indicates a data flow to refine.
            // const teamsRd3Decision = previouslyFetchedDecisions[rd3InvestPhaseId];
            // const teamRd3InvestmentIds = teamsRd3Decision?.selected_investment_ids || [];
            const allRd3Options = gameStructure.all_investment_options[rd3InvestPhaseId] || [];
            // return allRd3Options.filter(opt => teamRd3InvestmentIds.includes(opt.id));
            return allRd3Options; // Placeholder: Show all RD3 options. Needs filtering based on actual selection.
        }
        return [];
    }, [currentPhase, gameStructure, loggedInTeamId]);

    const teamDecisionDataForPhase = useCallback((phaseId: string): TeamDecision | undefined => {
        // This would ideally fetch from Supabase if needed, or use a local cache of this team's decisions
        // For now, it's a placeholder, as this page doesn't have AppContext.state.teamDecisions
        console.warn("teamDecisionDataForPhase needs implementation to fetch/use student's own decisions");
        return undefined;
    }, [sessionId, loggedInTeamId]);

    const getInitialSpentBudget = useCallback(() => { /* ... same as before, using teamDecisionDataForPhase ... */
        if (currentPhase?.phase_type === 'invest') {
            const decision = teamDecisionDataForPhase(currentPhase.id);
            return decision?.total_spent_budget || 0;
        }
        return 0;
    }, [currentPhase, teamDecisionDataForPhase]);

    if (!sessionId) { /* ... */
    }
    if (!loggedInTeamId || !loggedInTeamName) {
        return <TeamLogin sessionId={sessionId} onLoginSuccess={handleLoginSuccess}/>;
    }

    const kpiRoundLabel = currentPhase?.round_number ? `RD-${currentPhase.round_number} ${currentPhase.phase_type === 'kpi' || currentPhase.phase_type === 'leaderboard' ? 'Final ' : ''}KPIs` : "Game KPIs";

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
            {currentPhase && (currentPhase.round_number > 0 || currentPhase.phase_type.endsWith('kpi')) && ( // Show KPIs if in a round or specifically on a KPI phase
                <KpiDisplay teamName={loggedInTeamName} currentRoundLabel={kpiRoundLabel} kpis={currentTeamKpis}/>
            )}

            <div className="flex-grow p-3 md:p-4 overflow-y-auto">
                {/* ... Loading and Error UI ... */}
                {!isLoading && !pageError && (
                    <>
                        {isDecisionTime && currentPhase && submissionStatus !== 'success' ? (
                            <DecisionPanel
                                sessionId={sessionId}
                                teamId={loggedInTeamId}
                                currentPhase={currentPhase}
                                investmentOptions={investmentOptionsForCurrentPhase}
                                investUpToBudget={
                                    currentPhase?.phase_type === 'invest' && currentPhase.id && gameStructure.investment_phase_budgets?.[currentPhase.interactive_data_key || currentPhase.id]
                                        ? gameStructure.investment_phase_budgets[currentPhase.interactive_data_key || currentPhase.id]
                                        : 0
                                }
                                challengeOptions={challengeOptionsForCurrentPhase}
                                availableRd3Investments={rd3InvestmentsForDoubleDown}
                                onDecisionSubmit={handleDecisionSubmitSuccess}
                                isDecisionTime={isDecisionTime}
                                timeRemainingSeconds={timeRemainingSeconds}
                                currentSpentBudgetForInvestments={getInitialSpentBudget()}
                            />
                        ) : currentSlideForDisplay ? (
                            <div
                                className="h-[calc(100vh-(currentPhase && (currentPhase.round_number > 0 || currentPhase.phase_type.endsWith('kpi')) ? 200px : 50px))] md:h-[calc(100vh-(currentPhase && (currentPhase.round_number > 0 || currentPhase.phase_type.endsWith('kpi')) ? 250px : 80px))]">
                                <SlideRenderer slide={currentSlideForDisplay} isPlaying={false} isStudentView={true}/>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-10">
                                <Hourglass size={32} className="mx-auto mb-3 animate-pulse"/>
                                {submissionStatus === 'success' && submissionMessage ? submissionMessage : "Waiting for facilitator..."}
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* ... Submission Status Modals ... */}
        </div>
    );
};
export default StudentGamePage;