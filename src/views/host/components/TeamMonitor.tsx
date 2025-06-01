// src/components/Host/TeamSubmissions.tsx - Updated with New Supabase Structure
import React, {useState, useEffect} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import {TeamDecision} from '@shared/types/common';
import {CheckCircle2, Hourglass, XCircle, RotateCcw, Info, Wifi, WifiOff, AlertTriangle} from 'lucide-react';
import {useRealtimeSubscription, useSupabaseConnection} from '@shared/services/supabase';
import {useSupabaseMutation} from '@shared/hooks/supabase'
import Modal from '@shared/components/UI/Modal';

const TeamSubmissions: React.FC = () => {
    const {state, currentPhaseNode, fetchTeamsForSession} = useGameContext();
    const {teams, teamDecisions, currentSessionId, gameStructure} = state;

    const currentPhaseIdFromNode = currentPhaseNode?.id;

    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

    // Reset confirmation modal state
    const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
    const [teamToReset, setTeamToReset] = useState<{id: string, name: string} | null>(null);

    // Connection monitoring
    const connection = useSupabaseConnection();

    // Enhanced mutation hook for resetting decisions
    const {
        execute: resetDecision,
        isLoading: isResetting,
        error: resetError
    } = useSupabaseMutation(
        async (teamId: string, phaseId: string) => {
            // Use the resetTeamDecisionForPhase from AppContext which handles both DB and state
            const { resetTeamDecisionForPhase } = useGameContext();
            return resetTeamDecisionForPhase(teamId, phaseId);
        },
        {
            onSuccess: (_, teamId) => {
                console.log(`[TeamSubmissionTable] Successfully reset team ${teamId} decision`);
                setLastUpdateTime(new Date().toLocaleTimeString());
                // Optionally refresh teams data
                setTimeout(() => fetchTeamsForSession(), 500);
            },
            onError: (error, teamId) => {
                console.error(`[TeamSubmissionTable] Failed to reset team ${teamId} decision:`, error);
            }
        }
    );

    // Enhanced real-time subscription
    useRealtimeSubscription(
        `team-decisions-realtime-${currentSessionId}`,
        {
            table: 'team_decisions',
            filter: `session_id=eq.${currentSessionId}`,
            onchange: (payload) => {
                console.log(`[TeamSubmissionTable] Real-time team decision update:`, payload);
                setLastUpdateTime(new Date().toLocaleTimeString());
                setRealtimeStatus('connected');
            }
        },
        !!(currentSessionId && currentSessionId !== 'new' && currentPhaseIdFromNode)
    );

    // Monitor connection status
    useEffect(() => {
        if (connection.isConnected) {
            setRealtimeStatus('connected');
        } else if (connection.status === 'connecting') {
            setRealtimeStatus('connecting');
        } else {
            setRealtimeStatus('disconnected');
        }
    }, [connection.isConnected, connection.status]);

    const getTeamDecisionForCurrentPhase = (teamId: string): TeamDecision | undefined => {
        if (!currentPhaseIdFromNode) return undefined;
        const decisionsByTeam = teamDecisions[teamId] || {};
        return decisionsByTeam[currentPhaseIdFromNode];
    };

    const formatSelection = (decision?: TeamDecision): string => {
        if (!decision || !currentPhaseNode || !gameStructure) return 'Pending...';

        const dataKeyForOptions = currentPhaseNode.interactive_data_key || currentPhaseNode.id;

        if (currentPhaseNode.phase_type === 'invest' && decision.selected_investment_ids) {
            const investmentOptionsForPhase = gameStructure.all_investment_options[dataKeyForOptions] || [];
            if (decision.selected_investment_ids.length === 0) return "No Investments Made";

            const selectedNames = decision.selected_investment_ids.map(id => {
                const option = investmentOptionsForPhase.find(opt => opt.id === id);
                return option ? option.name.split('.')[0] || option.name.substring(0,15) : `ID: ${id.substring(id.length - 4)}`;
            }).join(', ');
            const totalSpent = decision.total_spent_budget !== undefined ? ` ($${(decision.total_spent_budget / 1000).toFixed(0)}k)` : '';
            return (selectedNames || 'Processing...') + totalSpent;
        }

        if (currentPhaseNode.phase_type === 'choice' && decision.selected_challenge_option_id) {
            const challengeOptionsForPhase = gameStructure.all_challenge_options[dataKeyForOptions] || [];
            const option = challengeOptionsForPhase.find(opt => opt.id === decision.selected_challenge_option_id);
            let optionLabel = `Option ${decision.selected_challenge_option_id}`;
            if (option) {
                optionLabel = option.text.length > 30 ? `${option.id}: "${option.text.substring(0, 27)}..."` : `${option.id}: "${option.text}"`;
            }
            return optionLabel;
        }

        if (currentPhaseNode.phase_type === 'double-down-prompt' && decision.selected_challenge_option_id) {
            const options = gameStructure.all_challenge_options[dataKeyForOptions] || [];
            const chosenOption = options.find(opt => opt.id === decision.selected_challenge_option_id);
            return chosenOption ? chosenOption.text : `Opted: ${decision.selected_challenge_option_id}`;
        }

        if (currentPhaseNode.phase_type === 'double-down-select' && decision.double_down_decision) {
            const dd = decision.double_down_decision;
            const rd3InvestKey = `rd3-invest`;
            const rd3InvestmentOptions = gameStructure.all_investment_options[rd3InvestKey] || [];

            if (!dd.investmentToSacrificeId && !dd.investmentToDoubleDownId) {
                const ddPromptPhaseKey = gameStructure.allPhases.find(p => p.phase_type === 'double-down-prompt' && p.round_number === currentPhaseNode.round_number)?.id;
                if (ddPromptPhaseKey && teamDecisions[decision.team_id]?.[ddPromptPhaseKey]?.selected_challenge_option_id === 'no_dd') {
                    return "Opted Out of Double Down";
                }
                return "No DD Selection Made";
            }

            const details = [];
            if(dd.investmentToSacrificeId) {
                const sacrificeOpt = rd3InvestmentOptions.find(o => o.id === dd.investmentToSacrificeId);
                details.push(`Sacrifice: ${sacrificeOpt ? sacrificeOpt.name.replace(/^\d+\.\s*/, '') : `ID ${dd.investmentToSacrificeId.substring(dd.investmentToSacrificeId.length - 4)}`}`);
            } else {
                details.push("Sacrifice: None Selected");
            }

            if(dd.investmentToDoubleDownId) {
                const doubleDownOpt = rd3InvestmentOptions.find(o => o.id === dd.investmentToDoubleDownId);
                details.push(`Double On: ${doubleDownOpt ? doubleDownOpt.name.replace(/^\d+\.\s*/, '') : `ID ${dd.investmentToDoubleDownId.substring(dd.investmentToDoubleDownId.length - 4)}`}`);
            } else {
                details.push("Double On: None Selected");
            }
            return details.join('; ');
        }

        if (decision.submitted_at) return 'Submitted (View Details)';
        return 'Pending...';
    };

    const handleResetClick = async (teamId: string, teamName: string) => {
        setTeamToReset({id: teamId, name: teamName});
        setIsResetModalOpen(true);
    };

    const confirmReset = async () => {
        if (!teamToReset || !currentSessionId || !currentPhaseIdFromNode) {
            console.error("Cannot reset: Missing team, session, or phase information");
            setIsResetModalOpen(false);
            setTeamToReset(null);
            return;
        }

        await resetDecision(teamToReset.id, currentPhaseIdFromNode);
        setIsResetModalOpen(false);
        setTeamToReset(null);
    };

    const handleManualRefresh = async () => {
        if (!currentSessionId || currentSessionId === 'new') return;

        console.log(`[TeamSubmissionTable] Manual refresh triggered`);
        try {
            await fetchTeamsForSession();
            setLastUpdateTime(new Date().toLocaleTimeString());
        } catch (error) {
            console.error('[TeamSubmissions] Error during manual refresh:', error);
        }
    };

    if (!currentPhaseNode?.is_interactive_player_phase) {
        return (
            <div className="bg-gray-50 p-3 my-4 rounded-lg shadow-inner text-center text-gray-500 text-sm">
                <Info size={18} className="inline mr-1.5 text-blue-500"/>
                Team submissions are not active for the current game phase ({currentPhaseNode?.label || 'N/A'}).
            </div>
        );
    }

    if (teams.length === 0 && !state.isLoading) {
        return <div className="text-center p-4 text-gray-500">No teams have joined the session yet.</div>;
    }

    const submittedCount = teams.filter(team => {
        const decision = getTeamDecisionForCurrentPhase(team.id);
        return !!decision?.submitted_at;
    }).length;

    return (
        <>
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-md border border-gray-200 mt-4">
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-800">
                            Team Submissions: <span className="text-blue-600">{currentPhaseNode?.label || 'Current Interactive Phase'}</span>
                            <span className="ml-2 text-sm font-normal text-gray-600">({submittedCount}/{teams.length})</span>
                        </h3>
                        {currentPhaseNode && <span className="text-xs text-gray-500">Phase ID: {currentPhaseNode.id}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Enhanced real-time status indicator */}
                        <div className="flex items-center gap-1 text-xs">
                            {realtimeStatus === 'connected' ? (
                                <Wifi size={14} className="text-green-500" />
                            ) : realtimeStatus === 'connecting' ? (
                                <Wifi size={14} className="text-yellow-500 animate-pulse" />
                            ) : (
                                <WifiOff size={14} className="text-red-500" />
                            )}
                            <span className={`${
                                realtimeStatus === 'connected' ? 'text-green-600' :
                                    realtimeStatus === 'connecting' ? 'text-yellow-600' :
                                        'text-red-600'
                            }`}>
                                {realtimeStatus === 'connected' ? 'Live' :
                                    realtimeStatus === 'connecting' ? 'Connecting...' :
                                        'Disconnected'}
                            </span>
                            {connection.latency && (
                                <span className="text-gray-500 ml-1">
                                    ({connection.latency}ms)
                                </span>
                            )}
                        </div>

                        {/* Manual refresh button */}
                        <button
                            onClick={handleManualRefresh}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-gray-100 text-gray-600 transition-colors border border-gray-300"
                            title="Manually refresh team data"
                        >
                            <RotateCcw size={14}/> Refresh
                        </button>

                        {/* Connection actions */}
                        {!connection.isConnected && (
                            <button
                                onClick={connection.forceReconnect}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                                title="Force reconnection"
                            >
                                <AlertTriangle size={14}/> Reconnect
                            </button>
                        )}
                    </div>
                </div>

                {lastUpdateTime && (
                    <div className="text-xs text-gray-500 mb-2">
                        Last update: {lastUpdateTime}
                    </div>
                )}

                {/* Show reset error if any */}
                {resetError && (
                    <div className="mb-3 p-2 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm">
                        Reset failed: {resetError}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100">
                        <tr>
                            <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Team
                            </th>
                            <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Selection/Details
                            </th>
                            <th scope="col" className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Reset
                            </th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {state.isLoading && teams.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-4 text-gray-500">Loading team data...</td>
                            </tr>
                        )}
                        {!state.isLoading && teams.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-4 text-gray-500">No teams in this session yet.</td>
                            </tr>
                        )}
                        {teams.map((team) => {
                            const decision = getTeamDecisionForCurrentPhase(team.id);
                            const hasSubmitted = !!decision?.submitted_at;

                            return (
                                <tr key={team.id}
                                    className={`${hasSubmitted ? 'bg-green-50/70 hover:bg-green-100/70' : 'bg-yellow-50/70 hover:bg-yellow-100/70'} transition-colors`}>
                                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-gray-800">{team.name}</td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                        {hasSubmitted ? (
                                            <span className="flex items-center text-green-700 font-medium">
                                                <CheckCircle2 size={16} className="mr-1.5 flex-shrink-0"/> Submitted
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-amber-700 font-medium">
                                                <Hourglass size={16} className="mr-1.5 flex-shrink-0 animate-pulse"/> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-600 max-w-md break-words">
                                        {formatSelection(decision)}
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                                        {hasSubmitted && (
                                            <button
                                                onClick={() => handleResetClick(team.id, team.name)}
                                                disabled={isResetting}
                                                className="text-red-600 hover:text-red-800 disabled:opacity-50 p-1.5 rounded-full hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 transition-colors"
                                                title="Reset this team's submission"
                                            >
                                                {isResetting ? <RotateCcw size={18} className="animate-spin"/> :
                                                    <XCircle size={18}/>}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => {
                    if (!isResetting) {
                        setIsResetModalOpen(false);
                        setTeamToReset(null);
                    }
                }}
                title="Reset Team Submission"
                size="sm"
            >
                <div className="p-1">
                    <div className="flex items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-orange-100 sm:mx-0 sm:h-8 sm:w-8">
                            <AlertTriangle className="h-5 w-5 text-orange-600" aria-hidden="true"/>
                        </div>
                        <div className="ml-3 text-left">
                            <p className="text-sm text-gray-700 mt-0.5">
                                Are you sure you want to reset <strong className="font-semibold">{teamToReset?.name}</strong>'s
                                submission for "<strong className="font-semibold">{currentPhaseNode?.label}</strong>"?
                            </p>
                            <p className="text-xs text-orange-600 mt-2">
                                This will clear their current submission and allow them to submit again. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 sm:mt-6 flex flex-row-reverse gap-3">
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm disabled:opacity-50 w-full sm:w-auto"
                            onClick={confirmReset}
                            disabled={isResetting || !teamToReset}
                        >
                            {isResetting ? (
                                <RotateCcw className="animate-spin h-5 w-5 mr-2"/>
                            ) : (
                                <XCircle className="h-5 w-5 mr-2"/>
                            )}
                            {isResetting ? 'Resetting...' : 'Yes, Reset'}
                        </button>
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 w-full sm:w-auto"
                            onClick={() => {
                                setIsResetModalOpen(false);
                                setTeamToReset(null);
                            }}
                            disabled={isResetting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default TeamSubmissions;