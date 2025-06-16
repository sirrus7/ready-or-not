// src/views/host/components/DecisionReviewModal.tsx
// FIXED VERSION - Properly handles immediate purchases in decision history

import React, {useMemo} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import Modal from '@shared/components/UI/Modal';
import {TeamDecision, Slide, GameStructure} from '@shared/types';
import {Info} from 'lucide-react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {supabase} from '@shared/services/supabase';

const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '$0';
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

// FIXED: Enhanced function that includes immediate purchases for investment decisions
const formatSelection = (
    decision: TeamDecision | undefined,
    slide: Slide | undefined,
    structure: GameStructure | null,
    immediatePurchases: ImmediatePurchaseData[]
): React.ReactNode => {
    if (!slide || !structure) return "Data not available";

    const key = slide.interactive_data_key!;

    switch (slide.type) {
        case 'interactive_invest': {
            // Get regular investment selections
            const investmentOptions = structure.all_investment_options[key] || [];
            const selectedIds = decision?.selected_investment_ids || [];

            // Get immediate purchases for this team
            const teamImmediatePurchases = immediatePurchases.filter(purchase =>
                purchase.team_id === decision?.team_id
            );

            // Combine regular and immediate selections
            const immediateIds: string[] = [];
            let immediateBudget = 0;

            teamImmediatePurchases.forEach(purchase => {
                immediateIds.push('rd1_inv_biz_growth'); // Business Growth Strategy
                immediateBudget += purchase.cost;
            });

            const allSelectedIds = [...immediateIds, ...selectedIds];

            if (allSelectedIds.length === 0) {
                return decision ?
                    <span className="text-gray-500 italic">No investments selected</span> :
                    <span className="text-gray-400 italic">No submission</span>;
            }

            const selectedNames = allSelectedIds.map(id => {
                const opt = investmentOptions.find(o => o.id === id);
                return opt ? opt.name.split('.')[0] : 'Business Growth Strategy';
            });

            const totalBudget = (decision?.total_spent_budget || 0) + immediateBudget;

            return (
                <div>
                    <div className="font-medium">{selectedNames.join(', ')}</div>
                    <div className="text-sm text-gray-500">
                        Total Spent: {formatCurrency(totalBudget)}
                        {immediateBudget > 0 && (
                            <span className="ml-2 text-blue-600">
                                (includes {formatCurrency(immediateBudget)} immediate purchase)
                            </span>
                        )}
                    </div>
                </div>
            );
        }

        case 'interactive_choice':
        case 'interactive_double_down_prompt': {
            if (!decision?.submitted_at) return <span className="text-gray-400 italic">No submission</span>;

            const choiceOptions = structure.all_challenge_options[key] || [];
            const choice = choiceOptions.find(o => o.id === decision.selected_challenge_option_id);
            return choice ? (
                <div>
                    <div className="font-medium">{choice.id}</div>
                    <div className="text-sm text-gray-600 italic">"{choice.text.substring(0, 50)}..."</div>
                </div>
            ) : `Option ID: ${decision.selected_challenge_option_id}`;
        }

        default:
            return decision?.submitted_at ? 'Submitted' : <span className="text-gray-400 italic">No submission</span>;
    }
};

interface DecisionReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    decisionKey: string | null;
}

const DecisionReviewModal: React.FC<DecisionReviewModalProps> = ({isOpen, onClose, decisionKey}) => {
    const {state} = useGameContext();
    const {teams, teamDecisions, gameStructure, currentSessionId} = state;

    // FIXED: Fetch immediate purchases for investment decisions
    const {data: immediatePurchases} = useSupabaseQuery(
        async () => {
            if (!currentSessionId || currentSessionId === 'new' || !decisionKey) return [];

            // Only fetch immediate purchases for investment decisions
            const interactiveSlide = gameStructure?.interactive_slides.find(
                s => s.interactive_data_key === decisionKey
            );

            if (interactiveSlide?.type !== 'interactive_invest') return [];

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
        [currentSessionId, decisionKey, gameStructure],
        {
            cacheKey: `review-immediate-purchases-${currentSessionId}-${decisionKey}`,
            cacheTimeout: 5000
        }
    );

    const reviewData = useMemo(() => {
        if (!decisionKey || !gameStructure) {
            return {title: 'Review Decisions', submissions: []};
        }

        const interactiveSlide = gameStructure.interactive_slides.find(
            s => s.interactive_data_key === decisionKey
        );

        const submissions = teams.map(team => {
            const decision = teamDecisions[team.id]?.[decisionKey];
            return {
                teamName: team.name,
                submission: formatSelection(
                    decision,
                    interactiveSlide,
                    gameStructure,
                    immediatePurchases || []
                )
            };
        });

        return {
            title: `Review: ${interactiveSlide?.title || decisionKey}`,
            submissions
        };
    }, [decisionKey, teams, teamDecisions, gameStructure, immediatePurchases]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={reviewData.title} size="md">
            <div className="p-2 max-h-[70vh] overflow-y-auto">
                {reviewData.submissions.length > 0 ? (
                    <div className="space-y-3">
                        {reviewData.submissions.map(item => (
                            <div key={item.teamName} className="border-b border-gray-200 pb-3 last:border-b-0">
                                <div className="flex items-start justify-between">
                                    <div className="font-medium text-gray-800 w-1/3 pr-4 flex-shrink-0">
                                        {item.teamName}
                                    </div>
                                    <div className="text-sm text-gray-600 flex-1">
                                        {item.submission}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <Info size={24} className="mx-auto mb-2"/>
                        <p>No submission data available for this decision point.</p>
                    </div>
                )}
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        </Modal>
    );
};

export default DecisionReviewModal;