// src/views/host/components/TeamMonitor.tsx - Enhanced with real-time investment tracking
import React, {useState, useEffect, useMemo} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import {TeamDecision} from '@shared/types';
import {CheckCircle2, Hourglass, XCircle, RotateCcw, Info, AlertTriangle, Users, Clock, DollarSign} from 'lucide-react';
import {useRealtimeSubscription, useSupabaseConnection} from '@shared/services/supabase';
import {useSupabaseMutation} from '@shared/hooks/supabase'
import Modal from '@shared/components/UI/Modal';

const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
};

const TeamSubmissions: React.FC = () => {
    const {
        state,
        currentPhaseNode,
        fetchTeamsForSession,
        resetTeamDecisionForPhase,
        setAllTeamsSubmittedCurrentInteractivePhase
    } = useGameContext();
    const {teams, teamDecisions, currentSessionId, gameStructure} = state;

    const currentPhaseIdFromNode = currentPhaseNode?.id;
    const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

    // Reset confirmation modal state
    const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
    const [teamToReset, setTeamToReset] = useState<{ id: string, name: string } | null>(null);

    // Connection monitoring
    const connection = useSupabaseConnection();

    // Enhanced real-time subscription for team decisions
    useRealtimeSubscription(
        `team-decisions-realtime-${currentSessionId}`,
        {
            table: 'team_decisions',
            filter: `session_id=eq.${currentSessionId}`,
            onchange: (payload) => {
                console.log(`[TeamMonitor] Real-time team decision update:`, payload);
                setLastUpdateTime(new Date().toLocaleTimeString());

                // Refresh teams data to get latest decisions
                if (currentSessionId && currentSessionId !== 'new') {
                    setTimeout(() => fetchTeamsForSession(), 500);
                }
            }
        },
        !!(currentSessionId && currentSessionId !== 'new' && currentPhaseIdFromNode)
    );

    // Calculate submission statistics
    const submissionStats = useMemo(() => {
        if (!currentPhaseIdFromNode || teams.length === 0) {
            return {submitted: 0, total: 0, allSubmitted: false};
        }

        const submittedCount = teams.filter(team => {
            const decision = teamDecisions[team.id]?.[currentPhaseIdFromNode];
            return !!decision?.submitted_at;
        }).length;

        const allSubmitted = submittedCount === teams.length && teams.length > 0;

        return {
            submitted: submittedCount,
            total: teams.length,
            allSubmitted
        };
    }, [teams, teamDecisions, currentPhaseIdFromNode]);

    // Auto-trigger host alert when all teams submit
    useEffect(() => {
        if (submissionStats.allSubmitted && currentPhaseNode?.is_interactive_player_phase) {
            console.log('[TeamMonitor] All teams have submitted - triggering host alert');
            setAllTeamsSubmittedCurrentInteractivePhase(true);
        } else {
            setAllTeamsSubmittedCurrentInteractivePhase(false);
        }
    }, [submissionStats.allSubmitted, currentPhaseNode?.is_interactive_player_phase, setAllTeamsSubmittedCurrentInteractivePhase]);

    const getTeamDecisionForCurrentPhase = (teamId: string): TeamDecision | undefined => {
        if (!currentPhaseIdFromNode) return undefined;
        const decisionsByTeam = teamDecisions[teamId] || {};
        return decisionsByTeam[currentPhaseIdFromNode];
    };

    const formatInvestmentSelection = (decision: TeamDecision): string => {
        if (!decision.selected_investment_ids || decision.selected_investment_ids.length === 0) {
            const budget = gameStructure?.investment_phase_budgets?.[currentPhaseIdFromNode!] || 0;
            return `No investments (${formatCurrency(budget)} unspent)`;
        }

        const dataKey = currentPhaseNode?.interactive_data_key || currentPhaseIdFromNode!;
        const investmentOptions = gameStructure?.all_investment_options?.[dataKey] || [];

        const selectedNames = decision.selected_investment_ids.map(id => {
            const option = investmentOptions.find(opt => opt.id === id);
            return option ? option.name.split('.')[0].trim() : `#${id.slice(-4)}`;
        });

        const totalSpent = decision.total_spent_budget || 0;
        const budget = gameStructure?.investment_phase_budgets?.[currentPhaseIdFromNode!] || 0;
        const unspent = budget - totalSpent;

        return `${selectedNames.join(', ')} (${formatCurrency(totalSpent)} spent, ${formatCurrency(unspent)} unspent)`;
    };

    const formatChoiceSelection = (decision: TeamDecision): string => {
        if (!decision.selected_challenge_option_id) return 'No choice made';

        const dataKey = currentPhaseNode?.interactive_data_key || currentPhaseIdFromNode!;
        const challengeOptions = gameStructure?.all_challenge_options?.[dataKey] || [];
        const option = challengeOptions.find(opt => opt.id === decision.selected_challenge_option_id);

        if (!option) return `Option ${decision.selected_challenge_option_id}`;

        return option.text.length > 40
            ? `${option.id}: "${option.text.substring(0, 37)}..."`
            : `${option.id}: "${option.text}"`;
    };

    const formatSelection = (decision?: TeamDecision): string => {
        if (!decision || !currentPhaseNode || !gameStructure) return 'Pending...';

        switch (currentPhaseNode.phase_type) {
            case 'invest':
                return formatInvestmentSelection(decision);
            case 'choice':
                return formatChoiceSelection(decision);
            case 'double-down-prompt':
                const dataKey = currentPhaseNode.interactive_data_key || currentPhaseNode.id;
                const ddOption = gameStructure.all_challenge_options[dataKey]
                    ?.find(opt => opt.id === decision.selected_challenge_option_id);
                return ddOption ? ddOption.text : `Choice: ${decision.selected_challenge_option_id}`;
            case 'double-down-select':
                if (!decision.double_down_decision) return 'No selection made';
                const dd = decision.double_down_decision;
                const rd3Options = gameStructure.all_investment_options['rd3-invest'] || [];
                const sacrificeOpt = rd3Options.find(opt => opt.id === dd.investmentToSacrificeId);
                const doubleOpt = rd3Options.find(opt => opt.id === dd.investmentToDoubleDownId);
                return `Sacrifice: ${sacrificeOpt?.name || dd.investmentToSacrificeId?.slice(-6)} | Double: ${doubleOpt?.name || dd.investmentToDoubleDownId?.slice(-6)}`;
            default:
                return decision.submitted_at ? 'Submitted' : 'Pending...';
        }
    };

    // Enhanced mutation hook for resetting decisions
    const {
        execute: resetDecision,
        isLoading: isResetting,
        error: resetError
    } = useSupabaseMutation(
        async (data: { teamId: string, phaseId: string }) => {
            console.log(`[TeamMonitor] Resetting decision for team ${data.teamId}, phase ${data.phaseId}`);
            await resetTeamDecisionForPhase(data.teamId, data.phaseId);
            // Refresh the team data after reset
            setTimeout(() => fetchTeamsForSession(), 300);
        },
        {
            onSuccess: (_, data) => {
                console.log(`[TeamMonitor] Successfully reset team ${data.teamId} decision`);
                setLastUpdateTime(new Date().toLocaleTimeString());
            },
            onError: (error, data) => {
                console.error(`[TeamMonitor] Failed to reset team ${data?.teamId} decision:`, error);
            }
        }
    );

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

        await resetDecision({teamId: teamToReset.id, phaseId: currentPhaseIdFromNode});
        setIsResetModalOpen(false);
        setTeamToReset(null);
    };

    // Early return conditions
    if (!currentPhaseNode?.is_interactive_player_phase) {
        return (
            <div className="bg-gray-50 p-3 my-4 rounded-lg shadow-inner text-center text-gray-500 text-sm">
                <Info size={18} className="inline mr-1.5 text-blue-500"/>
                Team submissions are not active for the current phase ({currentPhaseNode?.label || 'N/A'}).
            </div>
        );
    }

    if (teams.length === 0 && !state.isLoading) {
        return (
            <div className="text-center p-4 text-gray-500">
                <Users size={24} className="mx-auto mb-2 text-gray-400"/>
                No teams have joined the session yet.
            </div>
        );
    }

    return (
        <>
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-md border border-gray-200 mt-4">
                {/* Header with enhanced stats */}
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
                            {currentPhaseNode.phase_type === 'invest' &&
                                <DollarSign size={18} className="text-green-600"/>}
                            {currentPhaseNode.phase_type === 'choice' &&
                                <AlertTriangle size={18} className="text-orange-600"/>}
                            Team Submissions: <span className="text-blue-600">{currentPhaseNode.label}</span>
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span>Progress: {submissionStats.submitted}/{submissionStats.total}</span>
                            {currentPhaseNode && <span>Phase: {currentPhaseNode.id}</span>}
                            {lastUpdateTime && <span>Updated: {lastUpdateTime}</span>}
                        </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="text-right">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                            submissionStats.allSubmitted
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : submissionStats.submitted > 0
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                            {submissionStats.allSubmitted ? (
                                <CheckCircle2 size={16}/>
                            ) : submissionStats.submitted > 0 ? (
                                <Clock size={16}/>
                            ) : (
                                <Hourglass size={16}/>
                            )}
                            {submissionStats.submitted}/{submissionStats.total}
                        </div>
                    </div>
                </div>

                {/* Decision phase notice */}
                <div className={`mb-4 p-3 rounded-md border ${
                    submissionStats.allSubmitted
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                }`}>
                    <div className="flex items-center">
                        {submissionStats.allSubmitted ? (
                            <>
                                <CheckCircle2 size={16} className="text-green-600 mr-2"/>
                                <span className="text-sm font-medium text-green-800">
                                    All teams have submitted their decisions!
                                </span>
                            </>
                        ) : (
                            <>
                                <Users size={16} className="text-blue-600 mr-2"/>
                                <span className="text-sm font-medium text-blue-800">
                                    Students can make {currentPhaseNode.phase_type === 'invest' ? 'investment' : 'choice'} decisions on their devices
                                </span>
                            </>
                        )}
                    </div>
                    {!submissionStats.allSubmitted && (
                        <p className="text-xs text-blue-600 mt-1 ml-6">
                            {submissionStats.submitted > 0
                                ? `${submissionStats.total - submissionStats.submitted} teams still working...`
                                : 'Waiting for teams to begin submissions...'
                            }
                        </p>
                    )}
                </div>

                {/* Show reset error if any */}
                {resetError && (
                    <div className="mb-3 p-2 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm">
                        Reset failed: {resetError}
                    </div>
                )}

                {/* Submissions table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100">
                        <tr>
                            <th scope="col"
                                className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Team
                            </th>
                            <th scope="col"
                                className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th scope="col"
                                className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {currentPhaseNode.phase_type === 'invest' ? 'Investment Selection' : 'Selection Details'}
                            </th>
                            <th scope="col"
                                className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {state.isLoading && teams.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-4 text-gray-500">
                                    <div className="flex items-center justify-center">
                                        <div
                                            className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                                        Loading team data...
                                    </div>
                                </td>
                            </tr>
                        )}
                        {!state.isLoading && teams.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-4 text-gray-500">No teams in this session
                                    yet.
                                </td>
                            </tr>
                        )}
                        {teams.map((team) => {
                            const decision = getTeamDecisionForCurrentPhase(team.id);
                            const hasSubmitted = !!decision?.submitted_at;
                            const submittedTime = hasSubmitted && decision.submitted_at
                                ? new Date(decision.submitted_at).toLocaleTimeString()
                                : null;

                            return (
                                <tr key={team.id} className={`${
                                    hasSubmitted
                                        ? 'bg-green-50/70 hover:bg-green-100/70'
                                        : 'bg-yellow-50/70 hover:bg-yellow-100/70'
                                } transition-colors`}>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                        <div className="font-medium text-gray-800">{team.name}</div>
                                        {submittedTime && (
                                            <div className="text-xs text-gray-500">at {submittedTime}</div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                        {hasSubmitted ? (
                                            <span className="flex items-center text-green-700 font-medium">
                                                <CheckCircle2 size={16} className="mr-1.5 flex-shrink-0"/>
                                                Submitted
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-amber-700 font-medium">
                                                <Hourglass size={16} className="mr-1.5 flex-shrink-0 animate-pulse"/>
                                                Working...
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-gray-600 max-w-md">
                                        <div className="break-words">
                                            {formatSelection(decision)}
                                        </div>
                                        {currentPhaseNode.phase_type === 'invest' && decision?.total_spent_budget !== undefined && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Budget: {formatCurrency(decision.total_spent_budget)} / {formatCurrency(gameStructure?.investment_phase_budgets?.[currentPhaseIdFromNode!] || 0)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                                        {hasSubmitted && (
                                            <button
                                                onClick={() => handleResetClick(team.id, team.name)}
                                                disabled={isResetting}
                                                className="text-red-600 hover:text-red-800 disabled:opacity-50 p-1.5 rounded-full hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 transition-colors"
                                                title="Reset this team's submission"
                                            >
                                                {isResetting ? (
                                                    <RotateCcw size={18} className="animate-spin"/>
                                                ) : (
                                                    <XCircle size={18}/>
                                                )}
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
                        <div
                            className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-orange-100 sm:mx-0 sm:h-8 sm:w-8">
                            <AlertTriangle className="h-5 w-5 text-orange-600" aria-hidden="true"/>
                        </div>
                        <div className="ml-3 text-left">
                            <p className="text-sm text-gray-700 mt-0.5">
                                Are you sure you want to reset <strong
                                className="font-semibold">{teamToReset?.name}</strong>'s
                                submission for "<strong className="font-semibold">{currentPhaseNode?.label}</strong>"?
                            </p>
                            <p className="text-xs text-orange-600 mt-2">
                                This will clear their
                                current {currentPhaseNode?.phase_type === 'invest' ? 'investment selections' : 'choice'} and
                                allow them to submit again. This action cannot be undone.
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
