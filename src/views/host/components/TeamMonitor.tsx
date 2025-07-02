import React, {useEffect, useMemo, useState} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import {TeamDecision} from '@shared/types';
import {AlertTriangle, CheckCircle2, Clock, Info,} from 'lucide-react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {db, supabase} from '@shared/services/supabase';
import Modal from '@shared/components/UI/Modal';
import SelectionDisplay, {SelectionData} from './SelectionDisplay';
import {ContinuationPricingEngine} from '@core/game/ContinuationPricingEngine';
import { MultiSelectChallengeTracker } from '@core/game/MultiSelectChallengeTracker';

interface ImmediatePurchaseData {
    id: string;
    team_id: string;
    cost: number;
    submitted_at: string;
    report_given: boolean;
    selected_investment_options: string[];
}

const TeamMonitor: React.FC = () => {
    const {state, currentSlideData, resetTeamDecision, setAllTeamsSubmittedCurrentInteractivePhase} = useGameContext();
    const {teams, teamDecisions, gameStructure, currentSessionId} = state;

    // Modal states
    const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
    const [teamToReset, setTeamToReset] = useState<{ id: string, name: string } | null>(null);
    const [continuationPricingCache, setContinuationPricingCache] = useState<Record<string, any>>({});

    const decisionKey = currentSlideData?.interactive_data_key;
    const isInvestmentPeriod = currentSlideData?.type === 'interactive_invest';

    // Fetch immediate purchase data with real-time subscription
    const {
        data: immediatePurchases,
        refresh: refreshImmediatePurchases
    } = useSupabaseQuery(
        async () => {
            if (!currentSessionId || currentSessionId === 'new' || !isInvestmentPeriod) return [];

            // ✅ UPDATED - Use service layer
            const data = await db.decisions.getAllImmediatePurchases(currentSessionId);

            return data.map(item => ({
                id: item.id,
                team_id: item.team_id,
                cost: item.total_spent_budget || 0,
                submitted_at: item.submitted_at,
                report_given: item.report_given || false,
                selected_investment_options: item.selected_investment_options || []
            } as ImmediatePurchaseData));
        },
        [currentSessionId, isInvestmentPeriod],
        {
            cacheKey: `immediate-purchases-${currentSessionId}-${isInvestmentPeriod}`,
            cacheTimeout: 3000
        }
    );

    // Real-time subscription for immediate purchases
    useEffect(() => {
        if (!currentSessionId || !isInvestmentPeriod) return;

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
                    const record = payload.new || payload.old;
                    if (record &&
                        typeof record === 'object' && record.is_immediate_purchase &&
                        record.immediate_purchase_type === 'business_growth_strategy') {
                        refreshImmediatePurchases();
                    }
                }
            )
            .subscribe((_u: any) => {});

        return () => {
            channel.unsubscribe();
        };
    }, [currentSessionId, isInvestmentPeriod, refreshImmediatePurchases]);

    // Load continuation pricing for all teams
    useEffect(() => {
        const loadContinuationPricing = async () => {
            if (!currentSessionId || !currentSlideData || !teams.length) return;

            const currentRound = currentSlideData.round_number || 1;
            if (currentRound <= 1) return; // No continuation pricing for Round 1

            const pricingCache: Record<string, any> = {};

            // Calculate continuation pricing for each team
            for (const team of teams) {
                try {
                    pricingCache[team.id] = await ContinuationPricingEngine.calculateContinuationPricing(
                        currentSessionId,
                        team.id,
                        currentRound as 2 | 3
                    );
                } catch (error) {
                    console.error(`[TeamMonitor] Error loading continuation pricing for team ${team.id}:`, error);
                }
            }

            setContinuationPricingCache(pricingCache);
        };

        loadContinuationPricing();
    }, [currentSessionId, currentSlideData, teams]);

    // Safe immediate purchases array
    const safeImmediatePurchases = immediatePurchases || [];

    // Calculate submission statistics
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

    // REMOVED: Generic "all teams submitted" alert
    // The slide-specific host_alert should be triggered after processing instead

    // Structured selection data function with FIXED immediate purchases handling and DEBUG LOGS
    const getSelectionData = (decision?: TeamDecision, teamId?: string): SelectionData => {
        if (!currentSlideData || !gameStructure || !decisionKey) {
            return {
                type: 'none',
                hasSubmission: false
            };
        }

        switch (currentSlideData.type) {
            case 'interactive_invest': {
                const selectedIds = decision?.selected_investment_options || [];
                const investmentOptions = gameStructure.all_investment_options[decisionKey] || [];

                // Get immediate purchases for this team
                const teamImmediatePurchases = safeImmediatePurchases.filter(purchase =>
                    purchase.team_id === teamId
                );

                const immediateLetters: string[] = [];
                let immediateBudget = 0;

                // Extract immediate purchase data
                teamImmediatePurchases.forEach(purchase => {
                    if (purchase.selected_investment_options && Array.isArray(purchase.selected_investment_options)) {
                        immediateLetters.push(...purchase.selected_investment_options);
                    }
                    immediateBudget += purchase.cost;
                });

                // Combine regular selections and immediate purchases
                const allSelectedIds = [...immediateLetters, ...selectedIds];
                const totalBudget = (decision?.total_spent_budget || 0) + immediateBudget;

                // ✅ GET CONTINUATION PRICING from cache
                const teamContinuationPricing = teamId ? continuationPricingCache[teamId] : null;

                // Helper function to get actual cost for an investment
                const getActualCost = (investmentId: string, originalCost: number) => {
                    if (!teamContinuationPricing) return originalCost;

                    const pricing = teamContinuationPricing.investmentPricing?.find((p: any) => p.investmentId === investmentId);
                    return pricing?.finalPrice ?? originalCost;
                };

                // Sort alphabetically and create investment objects WITH CORRECT PRICING
                const sortedSelectedIds = [...allSelectedIds].sort();
                const investments = sortedSelectedIds.map(id => {
                    const opt = investmentOptions.find(o => o.id === id);
                    const optionName = opt ? opt.name.split('.')[0].trim() : 'Unknown';
                    const originalCost = opt?.cost || 0;
                    const actualCost = getActualCost(id, originalCost); // ✅ Use continuation pricing

                    return {
                        id,
                        name: optionName,
                        cost: actualCost, // ✅ Use actual cost (with continuation discount)
                        isImmediate: immediateLetters.includes(id)
                    };
                });

                return {
                    type: 'investment',
                    investments,
                    totalBudget,
                    hasSubmission: !!decision || teamImmediatePurchases.length > 0
                };
            }

            case 'interactive_choice': {
                const selectedOptionId = decision?.selected_challenge_option_id;
                const challengeOptions = gameStructure.all_challenge_options[decisionKey] || [];

                // Handle multi-select combinations
                if (selectedOptionId && selectedOptionId.includes(',')) {
                    const selectedOptions = MultiSelectChallengeTracker.parseSelection(selectedOptionId);
                    const displayText = MultiSelectChallengeTracker.getCombinationDisplayText(selectedOptions);

                    return {
                        type: 'choice',
                        choiceText: displayText,
                        hasSubmission: !!decision
                    };
                } else {
                    // Single selection (existing logic)
                    const selectedOption = challengeOptions.find(opt => opt.id === selectedOptionId);

                    return {
                        type: 'choice',
                        choiceText: selectedOption ? `Option ${selectedOption.id}` : 'Invalid selection',
                        hasSubmission: !!decision
                    };
                }
            }

            default:
                return {
                    type: 'none',
                    hasSubmission: !!decision
                };
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

                {/* Team Status List - Professional, clean design */}
                <div className="space-y-3">
                    {teams.map(team => {
                        const decision = decisionKey ? teamDecisions[team.id]?.[decisionKey] : undefined;
                        const hasSubmitted = !!decision?.submitted_at;
                        const selectionData = getSelectionData(decision, team.id);
                        const teamPurchase = safeImmediatePurchases.find(p => p.team_id === team.id);
                        const needsBusinessReport = teamPurchase && !teamPurchase.report_given;

                        return (
                            <div
                                key={team.id}
                                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                            >
                                {/* Team Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-2 h-2 rounded-full ${
                                            hasSubmitted ? 'bg-green-500' : 'bg-gray-300'
                                        }`}/>
                                        <div>
                                            <h4 className="font-medium text-gray-900">{team.name}</h4>
                                            <div className="text-xs text-gray-500">
                                                {hasSubmitted
                                                    ? `Submitted ${new Date(decision!.submitted_at!).toLocaleTimeString()}`
                                                    : 'Awaiting submission'
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {hasSubmitted && (
                                        <button
                                            onClick={() => openResetModal(team.id, team.name)}
                                            className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                {/* Selection Display */}
                                <div className="mb-3">
                                    <SelectionDisplay selectionData={selectionData}/>
                                </div>

                                {/* Business Report Alert */}
                                {needsBusinessReport && (
                                    <div
                                        className="flex items-center space-x-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
                                        <AlertTriangle size={14} className="flex-shrink-0"/>
                                        <span className="text-xs">
                                            Business Growth Strategy report required
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Reset Team Decision"
            >
                <div className="p-4">
                    <p className="text-gray-700 mb-4">
                        Are you sure you want to reset <strong>{teamToReset?.name}</strong>'s decision?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={() => setIsResetModalOpen(false)}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleResetDecision}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
