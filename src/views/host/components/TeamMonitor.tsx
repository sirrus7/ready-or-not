// src/views/host/components/TeamMonitor.tsx
// FIXED VERSION - Resolves null issues and syntax errors

import React, {useState, useMemo, useEffect} from 'react';
import {useGameContext} from '@app/providers/GameProvider.tsx';
import {TeamDecision} from '@shared/types';
import {
    CheckCircle2,
    Clock,
    XCircle,
    Info,
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
        data: immediatePurchases,
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

    // Ensure immediatePurchases is never null
    const safeImmediatePurchases: ImmediatePurchaseData[] = immediatePurchases || [];

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

    // FIXED: Now includes immediate purchases and handles null cases - updated to handle teams with only immediate purchases
    const formatSelection = (decision?: TeamDecision, teamId?: string): string => {
        if (!currentSlideData || !gameStructure || !decisionKey) return 'No submission yet';

        switch (currentSlideData.type) {
            case 'interactive_invest': {
                const selectedIds = decision?.selected_investment_ids || [];
                const investmentOptions = gameStructure.all_investment_options[decisionKey] || [];

                // Check if this team has immediate purchases for this phase
                const teamImmediatePurchases = safeImmediatePurchases.filter(purchase =>
                    purchase.team_id === (teamId || decision?.team_id)
                );
                const immediateIds: string[] = [];
                let immediateBudget = 0;

                // Extract immediate purchase IDs and budget
                teamImmediatePurchases.forEach(purchase => {
                    // Option A - Business Growth Strategy
                    immediateIds.push('rd1_inv_biz_growth');
                    immediateBudget += purchase.cost;
                });

                // Combine regular and immediate selections
                const allSelectedIds = [...immediateIds, ...selectedIds];

                // FIXED: Handle case where there are only immediate purchases (no regular decision yet)
                if (allSelectedIds.length === 0) {
                    return decision ? `No investments selected` : 'No submission yet';
                }

                const selectedNames = allSelectedIds.map(id =>
                    investmentOptions.find(opt => opt.id === id)?.name.split('.')[0] || 'Unknown'
                ).join(', ');

                const totalBudget = (decision?.total_spent_budget || 0) + immediateBudget;
                return `${selectedNames} (${formatCurrency(totalBudget)} spent)`;
            }
            case 'interactive_choice':
            case 'interactive_double_down_prompt': {
                if (!decision) return 'No submission yet';
                const optionId = decision.selected_challenge_option_id;
                if (!optionId) return 'No choice made';
                const options = gameStructure.all_challenge_options[decisionKey] || [];
                const option = options.find(opt => opt.id === optionId);
                return option ? `${option.id}: "${option.text.substring(0, 30)}..."` : `Option ${optionId}`;
            }
            default:
                return decision?.submitted_at ? 'Submitted' : 'Working...';
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
        const hasSubmitted = !!(decision?.submitted_at);
        const immediatePurchase = safeImmediatePurchases.find(purchase => purchase.team_id === team.id);

        return {
            ...team,
            decision,
            hasSubmitted,
            immediatePurchase
        };
    });

    const reportsNeeded = teamsWithStatus.filter(team =>
        team.immediatePurchase && !team.immediatePurchase.report_given
    );

    return (
        <div className="space-y-4">
            {/* Header with Stats */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-blue-600"/>
                    <span className="font-medium text-gray-800">Team Submissions</span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    submissionStats.allSubmitted
                        ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                    {submissionStats.allSubmitted ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                    {submissionStats.submitted}/{submissionStats.total}
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
                                    {isMarkingReport === team.immediatePurchase!.id ?
                                        <Clock size={12} className="animate-spin"/> :
                                        <CheckCircle size={12}/>
                                    }
                                    <span>Given</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Team List */}
            <div className="grid gap-2">
                {teamsWithStatus.map(team => (
                    <div key={team.id}
                         className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                             team.hasSubmitted
                                 ? 'bg-green-50 border-green-200'
                                 : 'bg-gray-50 border-gray-200'
                         }`}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                                className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <User size={14} className="text-gray-600"/>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-900 truncate">{team.name}</span>
                                    <span
                                        className={`flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-full ${
                                            team.hasSubmitted
                                                ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
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
                                    {formatSelection(team.decision, team.id)}
                                </div>
                                {team.immediatePurchase && (
                                    <div className="text-xs text-blue-600 truncate">
                                        Strategy: {formatCurrency(team.immediatePurchase.cost)} •
                                        Report {team.immediatePurchase.report_given ? 'Given ✓' : 'Needed'}
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
                ))}
            </div>

            {/* Reset Confirmation Modal */}
            <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset Team Decision">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Are you sure you want to reset the decision for <strong>{teamToReset?.name}</strong>?
                    </p>
                    <p className="text-xs text-gray-500">
                        This will allow them to make new selections. Their immediate purchases (like Business Growth
                        Strategy) will remain intact.
                    </p>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setIsResetModalOpen(false)}
                            className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmReset}
                            disabled={isResetting}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                            {isResetting ? 'Resetting...' : 'Reset Decision'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TeamMonitor;
