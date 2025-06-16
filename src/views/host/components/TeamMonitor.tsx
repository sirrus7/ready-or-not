// src/views/host/components/TeamMonitor.tsx
// FIXED VERSION - Proper immediate purchase notifications and real-time updates

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

    // FIXED: Only fetch immediate purchases for investment periods
    const isInvestmentPeriod = currentSlideData?.type === 'interactive_invest';

    // FIXED: Fetch immediate purchase data with real-time subscription
    const {
        data: immediatePurchases,
        refresh: refreshImmediatePurchases
    } = useSupabaseQuery(
        async () => {
            if (!currentSessionId || currentSessionId === 'new' || !isInvestmentPeriod) return [];

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
        [currentSessionId, isInvestmentPeriod],
        {
            cacheKey: `immediate-purchases-${currentSessionId}-${isInvestmentPeriod}`,
            cacheTimeout: 3000 // REDUCED: More frequent updates
        }
    );

    // FIXED: Real-time subscription for immediate purchases
    useEffect(() => {
        if (!currentSessionId || !isInvestmentPeriod) return;

        console.log('[TeamMonitor] Setting up real-time subscription for immediate purchases');

        const channel = supabase
            .channel(`immediate-purchases-${currentSessionId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'team_decisions',
                    filter: `session_id=eq.${currentSessionId}`,
                },
                (payload: any) => {
                    console.log('[TeamMonitor] Database change detected:', payload);

                    // Check if this is an immediate purchase - safely access properties
                    const record = payload.new || payload.old;
                    if (record &&
                        typeof record === 'object' && record.is_immediate_purchase &&
                        record.immediate_purchase_type === 'business_growth_strategy') {
                        console.log('[TeamMonitor] Immediate purchase detected, refreshing data');
                        refreshImmediatePurchases();
                    }
                }
            )
            .subscribe((status: any) => {
                console.log('[TeamMonitor] Subscription status:', status);
            });

        return () => {
            console.log('[TeamMonitor] Cleaning up real-time subscription');
            channel.unsubscribe();
        };
    }, [currentSessionId, isInvestmentPeriod, refreshImmediatePurchases]);

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

    // FIXED: Enhanced format selection with better immediate purchase handling
    const formatSelection = (decision?: TeamDecision, teamId?: string): string => {
        if (!currentSlideData || !gameStructure || !decisionKey) return 'No submission yet';

        switch (currentSlideData.type) {
            case 'interactive_invest': {
                const selectedIds = decision?.selected_investment_ids || [];
                const investmentOptions = gameStructure.all_investment_options[decisionKey] || [];

                // Get immediate purchases for this team
                const teamImmediatePurchases = safeImmediatePurchases.filter(purchase =>
                    purchase.team_id === (teamId || decision?.team_id)
                );

                const immediateIds: string[] = [];
                let immediateBudget = 0;

                // Extract immediate purchase IDs and budget
                teamImmediatePurchases.forEach(purchase => {
                    immediateIds.push('rd1_inv_biz_growth');
                    immediateBudget += purchase.cost;
                });

                // Combine regular and immediate selections
                const allSelectedIds = [...immediateIds, ...selectedIds];

                if (allSelectedIds.length === 0) {
                    return decision ?
                        `No investments (${formatCurrency(decision.total_spent_budget || 0)} spent)` :
                        'No submission yet';
                }

                const selectedNames = allSelectedIds.map(id => {
                    const opt = investmentOptions.find(o => o.id === id);
                    return opt ? opt.name.split('.')[0].trim() : id;
                });

                const totalBudget = (decision?.total_spent_budget || 0) + immediateBudget;
                return `${selectedNames.join(', ')} (${formatCurrency(totalBudget)} spent)`;
            }
            case 'interactive_choice': {
                const selectedOptionId = decision?.selected_challenge_option_id;
                const challengeOptions = gameStructure.all_challenge_options[decisionKey] || [];
                const selectedOption = challengeOptions.find(opt => opt.id === selectedOptionId);
                return selectedOption ? `Option ${selectedOption.id}` : (decision ? 'Invalid selection' : 'No submission yet');
            }
            default:
                return decision ? 'Submitted' : 'No submission yet';
        }
    };

    // FIXED: Mark report as given mutation
    const {execute: markReportGiven} = useSupabaseMutation(
        async (purchaseId: string) => {
            const {error} = await supabase
                .from('team_decisions')
                .update({report_given: true})
                .eq('id', purchaseId);

            if (error) throw error;
            refreshImmediatePurchases();
        }
    );

    const handleMarkReportGiven = async (purchaseId: string) => {
        setIsMarkingReport(purchaseId);
        try {
            await markReportGiven(purchaseId);
        } catch (error) {
            console.error('Error marking report as given:', error);
        } finally {
            setIsMarkingReport(null);
        }
    };

    const handleResetDecision = async () => {
        if (!teamToReset || !decisionKey) return;
        try {
            await resetTeamDecision(teamToReset.id, decisionKey);
            setIsResetModalOpen(false);
            setTeamToReset(null);
        } catch (error) {
            console.error('Error resetting decision:', error);
        }
    };

    const openResetModal = (teamId: string, teamName: string) => {
        setTeamToReset({id: teamId, name: teamName});
        setIsResetModalOpen(true);
    };

    if (!currentSlideData?.interactive_data_key) {
        return (
            <div className="p-4 text-center text-gray-500">
                <Info size={24} className="mx-auto mb-2 opacity-50"/>
                <p>No interactive slide selected</p>
            </div>
        );
    }

    return (
        <>
            <div className="p-4">
                {/* Submission Progress */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Submission Progress</h3>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">
                            {submissionStats.submitted} of {submissionStats.total} teams submitted
                        </span>
                        <div className="flex items-center">
                            {submissionStats.allSubmitted ? (
                                <CheckCircle2 className="text-green-600" size={20}/>
                            ) : (
                                <Clock className="text-orange-500" size={20}/>
                            )}
                        </div>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{width: `${teams.length > 0 ? (submissionStats.submitted / teams.length) * 100 : 0}%`}}
                        />
                    </div>
                </div>

                {/* FIXED: Immediate Purchase Notifications for Investment Periods */}
                {isInvestmentPeriod && safeImmediatePurchases.length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                        <div className="flex items-center mb-2">
                            <Zap className="text-yellow-600 mr-2" size={20}/>
                            <h3 className="font-semibold text-yellow-800">Business Growth Strategy Reports Needed</h3>
                        </div>
                        <div className="space-y-2">
                            {safeImmediatePurchases.map(purchase => {
                                const team = teams.find(t => t.id === purchase.team_id);
                                return (
                                    <div key={purchase.id}
                                         className="flex items-center justify-between bg-yellow-100 p-2 rounded">
                                        <div className="flex items-center">
                                            <User className="text-yellow-700 mr-2" size={16}/>
                                            <span className="text-sm font-medium text-yellow-800">
                                                {team?.name || 'Unknown Team'} - {formatCurrency(purchase.cost)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleMarkReportGiven(purchase.id)}
                                            disabled={purchase.report_given || isMarkingReport === purchase.id}
                                            className={`px-3 py-1 text-xs rounded transition-colors ${
                                                purchase.report_given
                                                    ? 'bg-green-200 text-green-800 cursor-default'
                                                    : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                                            }`}
                                        >
                                            {purchase.report_given ? (
                                                <>
                                                    <CheckCircle className="inline mr-1" size={12}/>
                                                    Report Given
                                                </>
                                            ) : isMarkingReport === purchase.id ? (
                                                'Marking...'
                                            ) : (
                                                'Mark as Given'
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Team Status List */}
                <div className="space-y-2">
                    {teams.map(team => {
                        const decision = teamDecisions[team.id]?.[decisionKey];
                        const hasSubmitted = !!decision?.submitted_at;
                        const selection = formatSelection(decision, team.id);

                        return (
                            <div
                                key={team.id}
                                className={`p-3 rounded-lg border transition-colors ${
                                    hasSubmitted
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-gray-50 border-gray-200'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className={`mr-3 ${hasSubmitted ? 'text-green-600' : 'text-gray-400'}`}>
                                            {hasSubmitted ? <CheckCircle2 size={20}/> : <XCircle size={20}/>}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">{team.name}</h4>
                                            <p className="text-sm text-gray-600">{selection}</p>
                                            {decision?.submitted_at && (
                                                <p className="text-xs text-gray-500">
                                                    Submitted: {new Date(decision.submitted_at).toLocaleTimeString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {hasSubmitted && (
                                        <button
                                            onClick={() => openResetModal(team.id, team.name)}
                                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {teams.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <AlertTriangle size={24} className="mx-auto mb-2 opacity-50"/>
                        <p>No teams found for this session</p>
                    </div>
                )}
            </div>

            {/* Reset Confirmation Modal */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Reset Team Decision"
                size="sm"
            >
                <div className="p-4">
                    <p className="text-sm text-gray-700 mb-4">
                        Are you sure you want to reset the decision for <strong>{teamToReset?.name}</strong>?
                        This will allow them to resubmit their choice.
                    </p>
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={() => setIsResetModalOpen(false)}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleResetDecision}
                            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Reset Decision
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default TeamMonitor;
