// src/views/host/components/DecisionReviewModal.tsx
import React, {useMemo} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import Modal from '@shared/components/UI/Modal';
import {TeamDecision, Slide, GameStructure} from '@shared/types';
import {Info} from 'lucide-react';

const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '$0';
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

// REFACTOR: Moved this helper function outside the component body to fix the ReferenceError.
const formatSelection = (decision: TeamDecision | undefined, slide: Slide | undefined, structure: GameStructure | null): React.ReactNode => {
    if (!decision?.submitted_at) return <span className="text-gray-400 italic">No submission</span>;
    if (!slide || !structure) return "Data not available";

    const key = slide.interactive_data_key!;

    switch (slide.type) {
        case 'interactive_invest':
            const investmentOptions = structure.all_investment_options[key] || [];
            const selectedIds = decision.selected_investment_ids || [];
            if (selectedIds.length === 0) return "No investments selected";

            const selectedNames = selectedIds.map(id => {
                const opt = investmentOptions.find(o => o.id === id);
                return opt ? opt.name.split('.')[0] : 'Unknown';
            });
            return `${selectedNames.join(', ')} (${formatCurrency(decision.total_spent_budget)})`;

        case 'interactive_choice':
        case 'interactive_double_down_prompt':
            const choiceOptions = structure.all_challenge_options[key] || [];
            const choice = choiceOptions.find(o => o.id === decision.selected_challenge_option_id);
            return choice ? choice.text : `Option ID: ${decision.selected_challenge_option_id}`;

        default:
            return 'Submitted';
    }
};

interface DecisionReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    decisionKey: string | null;
}

const DecisionReviewModal: React.FC<DecisionReviewModalProps> = ({isOpen, onClose, decisionKey}) => {
    const {state} = useGameContext();
    const {teams, teamDecisions, gameStructure} = state;

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
                submission: formatSelection(decision, interactiveSlide, gameStructure)
            };
        });

        return {
            title: `Review: ${interactiveSlide?.title || decisionKey}`,
            submissions
        };
    }, [decisionKey, teams, teamDecisions, gameStructure]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={reviewData.title} size="md">
            <div className="p-2 max-h-[70vh] overflow-y-auto">
                {reviewData.submissions.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Submission</th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {reviewData.submissions.map(item => (
                            <tr key={item.teamName}>
                                <td className="px-4 py-3 font-medium text-gray-800 align-top w-1/3">{item.teamName}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 align-top">{item.submission}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
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
