// src/views/team/components/DecisionForms/DecisionHeader.tsx
import React from 'react';
import {Slide} from '@shared/types';
import {DecisionState} from '@views/team/hooks/useDecisionMaking';
import {DollarSign, Target, AlertCircle, CheckCircle} from 'lucide-react';

const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

interface DecisionHeaderProps {
    currentSlide: Slide;
    state: DecisionState;
    investUpToBudget: number;
    remainingBudget: number;
    submissionSummary: string;
    isValidSubmission: boolean; // Not used directly, but part of the props from the hook
}

const DecisionHeader: React.FC<DecisionHeaderProps> = ({
                                                           currentSlide,
                                                           state,
                                                           investUpToBudget,
                                                           remainingBudget,
                                                           submissionSummary
                                                       }) => {
    if (currentSlide.type !== 'interactive_invest') {
        return (
            <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 flex items-center justify-center gap-2">
                    <Target size={24} className="text-blue-400"/>
                    {currentSlide.title || "Make Your Decision"}
                </h3>
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-300">
                        <strong>Current Selection:</strong> {submissionSummary || 'No selection made'}
                    </p>
                </div>
            </div>
        );
    }

    const budgetStatus = remainingBudget < 0 ? 'over' : remainingBudget === 0 ? 'full' : 'under';
    const budgetColor = budgetStatus === 'over' ? 'text-red-400' :
        budgetStatus === 'full' ? 'text-green-400' : 'text-blue-400';

    return (
        <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 flex items-center justify-center gap-2">
                <DollarSign size={24} className="text-green-400"/>
                RD-{currentSlide.round_number} Investment Decisions
            </h3>
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="text-center"><p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total
                        Budget</p><p className="font-bold text-green-400 text-lg">{formatCurrency(investUpToBudget)}</p>
                    </div>
                    <div className="text-center"><p
                        className="text-gray-400 text-xs uppercase tracking-wide mb-1">Spent</p><p
                        className="font-bold text-yellow-400 text-lg">{formatCurrency(state.spentBudget)}</p><p
                        className="text-xs text-gray-400">{state.selectedInvestmentOptions.length} investment{state.selectedInvestmentOptions.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-center"><p
                        className="text-gray-400 text-xs uppercase tracking-wide mb-1">Remaining</p><p
                        className={`font-bold text-lg ${budgetColor}`}>{formatCurrency(remainingBudget)}</p>
                        {budgetStatus === 'over' && (
                            <div className="flex items-center justify-center text-xs text-red-300 mt-1"><AlertCircle
                                size={12} className="mr-1"/> Over Budget</div>)}
                        {budgetStatus === 'full' && (
                            <div className="flex items-center justify-center text-xs text-green-300 mt-1"><CheckCircle
                                size={12} className="mr-1"/> Budget Used</div>)}
                    </div>
                </div>
            </div>
            <div className="mb-4">
                <div className="bg-gray-600 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${budgetStatus === 'over' ? 'bg-red-500' : budgetStatus === 'full' ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{width: `${Math.min(100, (state.spentBudget / investUpToBudget) * 100)}%`}}/>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>$0</span><span>{formatCurrency(investUpToBudget)}</span></div>
            </div>
        </div>
    );
};

export default DecisionHeader;
