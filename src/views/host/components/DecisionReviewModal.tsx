// src/views/host/components/DecisionReviewModal.tsx
// Professional design that matches TeamMonitor styling

import React, {useMemo} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import Modal from '@shared/components/UI/Modal';
import {TeamDecision} from '@shared/types';
import {Info} from 'lucide-react';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {supabase} from '@shared/services/supabase';
import SelectionDisplay, {SelectionData} from './SelectionDisplay';

interface ImmediatePurchaseData {
    id: string;
    team_id: string;
    cost: number;
    submitted_at: string;
    report_given: boolean;
    selected_investment_options: string[];
}

interface DecisionReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    decisionKey: string | null;
}

const DecisionReviewModal: React.FC<DecisionReviewModalProps> = ({isOpen, onClose, decisionKey}) => {
    const {state} = useGameContext();
    const {teams, teamDecisions, gameStructure, currentSessionId} = state;

    // Fetch immediate purchases for investment decisions
    const {data: immediatePurchases} = useSupabaseQuery(
        async () => {
            if (!currentSessionId || currentSessionId === 'new' || !decisionKey) return [];

            const interactiveSlide = gameStructure?.interactive_slides.find(
                s => s.interactive_data_key === decisionKey
            );

            if (interactiveSlide?.type !== 'interactive_invest') return [];

            const {data, error} = await supabase
                .from('team_decisions')
                .select('id, team_id, total_spent_budget, submitted_at, report_given, selected_investment_options')
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
                report_given: item.report_given || false,
                selected_investment_options: item.selected_investment_options || []
            } as ImmediatePurchaseData));
        },
        [currentSessionId, decisionKey, gameStructure],
        {
            cacheKey: `review-immediate-purchases-${currentSessionId}-${decisionKey}`,
            cacheTimeout: 5000
        }
    );

    // Function to create selection data (same logic as TeamMonitor)
    const getSelectionData = (decision?: TeamDecision, teamId?: string): SelectionData => {
        if (!gameStructure || !decisionKey) {
            return {
                type: 'none',
                hasSubmission: false
            };
        }

        const interactiveSlide = gameStructure.interactive_slides.find(
            s => s.interactive_data_key === decisionKey
        );

        if (!interactiveSlide) {
            return {
                type: 'none',
                hasSubmission: false
            };
        }

        switch (interactiveSlide.type) {
            case 'interactive_invest': {
                const selectedIds = decision?.selected_investment_options || [];
                const investmentOptions = gameStructure.all_investment_options[decisionKey] || [];

                // Get immediate purchases for this team
                const teamImmediatePurchases = (immediatePurchases || []).filter(purchase =>
                    purchase.team_id === teamId
                );

                const immediateLetters: string[] = [];
                let immediateBudget = 0;

                teamImmediatePurchases.forEach(purchase => {
                    immediateLetters.push(...(purchase.selected_investment_options || []));
                    immediateBudget += purchase.cost;
                });

                // Combine regular selections and immediate purchases
                const allSelectedIds = [...immediateLetters, ...selectedIds];
                const totalBudget = (decision?.total_spent_budget || 0) + immediateBudget;

                // Sort alphabetically and create investment objects
                const sortedSelectedIds = [...allSelectedIds].sort();
                const investments = sortedSelectedIds.map(id => {
                    const opt = investmentOptions.find(o => o.id === id);
                    const optionName = opt ? opt.name.split('.')[0].trim() : 'Unknown';
                    return {
                        id,
                        name: optionName,
                        cost: opt?.cost || 0,
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
                const selectedOption = challengeOptions.find(opt => opt.id === selectedOptionId);

                return {
                    type: 'choice',
                    choiceText: selectedOption ? `Option ${selectedOption.id}` : 'Invalid selection',
                    hasSubmission: !!decision
                };
            }

            default:
                return {
                    type: 'none',
                    hasSubmission: !!decision
                };
        }
    };

    const reviewData = useMemo(() => {
        if (!decisionKey || !gameStructure) {
            return {title: 'Review Decisions', submissions: []};
        }

        const interactiveSlide = gameStructure.interactive_slides.find(
            s => s.interactive_data_key === decisionKey
        );

        const submissions = teams.map(team => {
            const decision = teamDecisions[team.id]?.[decisionKey];
            const hasSubmitted = !!decision?.submitted_at;
            const selectionData = getSelectionData(decision, team.id);

            return {
                teamName: team.name,
                hasSubmitted,
                selectionData,
                submittedAt: decision?.submitted_at
            };
        });

        return {
            title: `Review: ${interactiveSlide?.title || decisionKey}`,
            submissions
        };
    }, [decisionKey, teams, teamDecisions, gameStructure, immediatePurchases]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={reviewData.title} size="lg">
            <div className="p-6">
                {reviewData.submissions.length > 0 ? (
                    <div className="space-y-4">
                        {reviewData.submissions.map(item => (
                            <div
                                key={item.teamName}
                                className="bg-white rounded-lg border border-gray-200 p-4"
                            >
                                {/* Team Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-2 h-2 rounded-full ${
                                            item.hasSubmitted ? 'bg-green-500' : 'bg-gray-300'
                                        }`}/>
                                        <div>
                                            <h4 className="font-medium text-gray-900">{item.teamName}</h4>
                                            {item.submittedAt && (
                                                <div className="text-xs text-gray-500">
                                                    Submitted {new Date(item.submittedAt).toLocaleTimeString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Selection Display */}
                                <SelectionDisplay selectionData={item.selectionData}/>
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

            <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-lg">
                <div className="flex justify-end">
                    <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DecisionReviewModal;
