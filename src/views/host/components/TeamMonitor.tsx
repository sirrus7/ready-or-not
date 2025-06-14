// src/views/host/components/TeamMonitor.tsx
// Production-ready responsive card layout with Business Growth Strategy integration

import React, {useState, useMemo, useEffect} from 'react';
import {useGameContext} from '@app/providers/GameProvider.tsx';
import {TeamDecision} from '@shared/types';
import {
    CheckCircle2,
    Clock,
    XCircle,
    Info,
    FileText,
    AlertTriangle,
    User,
    CheckCircle,
    Zap
} from 'lucide-react';
import {useSupabaseMutation, useSupabaseQuery} from '@shared/hooks/supabase';
import {supabase} from '@shared/services/supabase';
import Modal from '@shared/components/UI/Modal';

const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

interface ImmediatePurchaseData {
    id: string;
    team_id: string;
    cost: number;
    submitted_at: string;
    report_given: boolean;
}

const TeamMonitor: React.FC = () => {
    const {state, currentSlideData, resetTeamDecision, setAllTeamsSubmittedCurrentInteractivePhase} = useGameContext();
    const {teams, teamDecisions, gameStructure, currentSessionId} = state;
    const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
    const [teamToReset, setTeamToReset] = useState<{ id: string, name: string } | null>(null);
    const [isMarkingReport, setIsMarkingReport] = useState<string | null>(null);

    const decisionKey = currentSlideData?.interactive_data_key;

    // Fetch immediate purchase data for Business Growth Strategy reports
    const {
        data: immediatePurchases = [],
        refresh: refreshImmediatePurchases
    } = useSupabaseQuery(
        async () => {
            if (!currentSessionId || currentSessionId === 'new') return [];

            const {data, error} = await supabase
                .from('team_decisions')
                .select('id, team_id, total_spent_budget, submitted_at, report_given')
                .eq('session_id', currentSessionId)
                .eq('is_immediate_purchase', true)
                .eq('immediate_purchase_type', 'business_growth_strategy')
                .like('phase_id', '%_immediate');

            if (error) throw error;

            return (data || []).map(item => ({
                id: item.id,
                team_id: item.team_id,
                cost: item.total_spent_budget || 0,
                submitted_at: item.submitted_at,
                report_given: item.report_given || false
            } as ImmediatePurchaseData));
        },
        [currentSessionId],
        {
            cacheKey: `immediate-purchases-${currentSessionId}`,
            cacheTimeout: 5000
        }
    );

    const submissionStats = useMemo(() => {
        if (!decisionKey || teams.length === 0) {
            return {submitted: 0, total: teams.length, allSubmitted: false};
        }
        const submittedCount = teams.filter(team => teamDecisions[team.id]?.[decisionKey]?.submitted_at).length;
        return {
            submitted: submittedCount,
            total: teams.length,
            allSubmitted: submittedCount === teams.length && teams.length > 0,
        };
    }, [teams, teamDecisions, decisionKey]);

    useEffect(() => {
        setAllTeamsSubmittedCurrentInteractivePhase(submissionStats.allSubmitted);
    }, [submissionStats.allSubmitted, setAllTeamsSubmittedCurrentInteractivePhase]);

    const formatSelection = (decision?: TeamDecision): string => {
        if (!decision || !currentSlideData || !gameStructure || !decisionKey) return 'No submission yet';
        switch (currentSlideData.type) {
            case 'interactive_invest': {
                const selectedIds = decision.selected_investment_ids || [];
                if (selectedIds.length === 0) return `No investments selected`;
                const investmentOptions = gameStructure.all_investment_options[decisionKey] || [];
                const selectedNames = selectedIds.map(id => investmentOptions.find(opt => opt.id === id)?.name.split('.')[0] || 'Unknown').join(', ');
                return `${selectedNames} (${formatCurrency(decision.total_spent_budget || 0)} spent)`;
            }
            case 'interactive_choice':
            case 'interactive_double_down_prompt': {
                const optionId = decision.selected_challenge_option_id;
                if (!optionId) return 'No choice made';
                const options = gameStructure.all_challenge_options[decisionKey] || [];
                const option = options.find(opt => opt.id === optionId);
                return option ? `${option.id}: "${option.text.substring(0, 30)}..."` : `Option ${optionId}`;
            }
            default:
                return decision.submitted_at ? 'Submitted' : 'Working...';
        }
    };

    const {execute: executeReset, isLoading: isResetting, error: resetError} = useSupabaseMutation(
        async (data: { teamId: string, decisionKey: string }) => {
            await resetTeamDecision(data.teamId, data.decisionKey);
        }
    );

    const handleResetClick = (teamId: string, teamName: string) => {
        setTeamToReset({id: teamId, name: teamName});
        setIsResetModalOpen(true);
    };

    const confirmReset = async () => {
        if (!teamToReset || !decisionKey) return;
        await executeReset({teamId: teamToReset.id, decisionKey});
        setIsResetModalOpen(false);
        setTeamToReset(null);
    };

    const markReportAsGiven = async (purchaseId: string) => {
        setIsMarkingReport(purchaseId);
        try {
            const {error} = await supabase
                .from('team_decisions')
                .update({
                    report_given: true,
                    report_given_at: new Date().toISOString()
                })
                .eq('id', purchaseId);

            if (error) throw error;
            await refreshImmediatePurchases();
        } catch (error) {
            console.error('Failed to mark report as given:', error);
        } finally {
            setIsMarkingReport(null);
        }
    };

    if (!currentSlideData || !decisionKey) {
        return (
            <div className="p-4 text-center text-gray-500">
                <Info size={20} className="mx-auto mb-1 text-blue-500"/>
                <p className="text-sm">Submissions are not active for this slide.</p>
            </div>
        );
    }

    // Group teams by status for better organization
    const teamsWithStatus = teams.map(team => {
        const decision = teamDecisions[team.id]?.[decisionKey];
        const hasSubmitted = !!decision?.submitted_at;
        const immediatePurchase = (immediatePurchases || []).find(ip => ip.team_id === team.id);

        return {
            ...team,
            decision,
            hasSubmitted,
            immediatePurchase,
            needsReport: immediatePurchase && !immediatePurchase.report_given
        };
    });

    const reportsNeeded = teamsWithStatus.filter(team => team.needsReport);
    const otherTeams = teamsWithStatus.filter(team => !team.needsReport);

    return (
        <>
            <div className="p-2 space-y-2">
                {/* Compact Header */}
                <div className="flex justify-between items-center pb-1 border-b border-gray-200">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800">Team Submissions</h3>
                        <p className="text-xs text-gray-500 truncate">{currentSlideData.title}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        {reportsNeeded.length > 0 && (
                            <span
                                className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                                <FileText size={12}/>
                                {reportsNeeded.length}
                            </span>
                        )}
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full font-medium ${
                            submissionStats.allSubmitted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                            {submissionStats.allSubmitted ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                            {submissionStats.submitted}/{submissionStats.total}
                        </span>
                    </div>
                </div>

                {resetError && (
                    <div className="p-2 bg-red-100 text-red-700 rounded text-xs">
                        Reset failed: {resetError}
                    </div>
                )}

                {/* Reports Needed - Compact Alert Style */}
                {reportsNeeded.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded p-2">
                        <div className="flex items-center gap-1 text-orange-800 font-medium text-xs mb-1">
                            <AlertTriangle size={14}/>
                            <span>Strategy Reports Needed</span>
                        </div>
                        <div className="space-y-1">
                            {reportsNeeded.map(team => (
                                <div key={`report-${team.id}`}
                                     className="flex items-center justify-between bg-white rounded p-2 border border-orange-100">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <div
                                            className="w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                                            <User size={12} className="text-orange-700"/>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div
                                                className="font-medium text-orange-900 text-sm truncate">{team.name}</div>
                                            <div className="text-xs text-orange-600">
                                                {formatCurrency(team.immediatePurchase!.cost)} • {new Date(team.immediatePurchase!.submitted_at).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => markReportAsGiven(team.immediatePurchase!.id)}
                                        disabled={isMarkingReport === team.immediatePurchase!.id}
                                        className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
                                    >
                                        {isMarkingReport === team.immediatePurchase!.id ? (
                                            <div
                                                className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"/>
                                        ) : (
                                            <CheckCircle size={12}/>
                                        )}
                                        <span className="hidden sm:inline">Given</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Team Cards - Compact Grid */}
                <div className="space-y-1">
                    {otherTeams.map(team => (
                        <div key={team.id} className={`rounded border-l-4 p-2 transition-colors ${
                            team.hasSubmitted
                                ? 'bg-green-50 border-l-green-400'
                                : 'bg-yellow-50 border-l-yellow-400'
                        }`}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            team.hasSubmitted ? 'bg-green-200' : 'bg-yellow-200'
                                        }`}>
                                        <User size={12}
                                              className={team.hasSubmitted ? 'text-green-700' : 'text-yellow-700'}/>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <span
                                                className="font-medium text-gray-900 text-sm truncate">{team.name}</span>
                                            <span
                                                className={`flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                                                    team.hasSubmitted
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {team.hasSubmitted ? <CheckCircle2 size={10}/> : <Clock size={10}/>}
                                                {team.hasSubmitted ? 'Done' : 'Working'}
                                            </span>
                                            {team.immediatePurchase && (
                                                <span
                                                    className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex-shrink-0">
                                                    <Zap size={10}/>
                                                    <span className="hidden sm:inline">Report</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-600 truncate">
                                            {formatSelection(team.decision)}
                                        </div>
                                        {team.immediatePurchase && (
                                            <div className="text-xs text-blue-600 truncate">
                                                Strategy: {formatCurrency(team.immediatePurchase.cost)} • Report Given ✓
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {team.hasSubmitted && (
                                    <button
                                        onClick={() => handleResetClick(team.id, team.name)}
                                        disabled={isResetting}
                                        className="flex items-center gap-1 px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded text-xs font-medium transition-colors flex-shrink-0"
                                        title="Reset submission"
                                    >
                                        <XCircle size={12}/>
                                        <span className="hidden sm:inline">Reset</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {teams.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                        <User size={20} className="mx-auto mb-2 text-gray-400"/>
                        <p className="text-sm font-medium">No teams found</p>
                        <p className="text-xs">Teams will appear here once they join.</p>
                    </div>
                )}
            </div>

            {/* Reset Confirmation Modal */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Reset Team Submission"
                size="sm"
            >
                <div className="p-1">
                    <p className="text-sm">Are you sure you want to reset the submission
                        for <strong>{teamToReset?.name}</strong>? This will allow them to submit again.</p>
                    <div className="mt-4 flex flex-row-reverse gap-2">
                        <button
                            onClick={confirmReset}
                            disabled={isResetting}
                            className="bg-red-600 text-white inline-flex justify-center rounded border border-transparent shadow-sm px-3 py-1.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                            {isResetting ? (
                                <div
                                    className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-1"/>
                            ) : null}
                            {isResetting ? 'Resetting...' : 'Reset'}
                        </button>
                        <button
                            onClick={() => setIsResetModalOpen(false)}
                            disabled={isResetting}
                            className="bg-white text-gray-700 inline-flex justify-center rounded border border-gray-300 shadow-sm px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default TeamMonitor;
