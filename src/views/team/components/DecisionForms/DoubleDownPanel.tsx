// src/views/team/components/DecisionForms/DoubleDownPanel.tsx
import React from 'react';
import {Dice6, Shield, Trash2, Target} from 'lucide-react';
import {InvestmentOption, ChallengeOption} from '@shared/types';
import {formatCurrency} from '@shared/utils/formatUtils';

interface DoubleDownPanelProps {
    challengeOptions: ChallengeOption[];
    availableRd3Investments: InvestmentOption[];
    selectedChallengeOptionId: string | null;
    sacrificeInvestmentId: string | null;
    doubleDownOnInvestmentId: string | null;
    onChallengeSelect: (optionId: string) => void;
    onSacrificeChange: (id: string | null) => void;
    onDoubleDownChange: (id: string | null) => void;
    isSubmitting: boolean;
}

const DoubleDownPanel: React.FC<DoubleDownPanelProps> = ({
                                                             challengeOptions,
                                                             availableRd3Investments,
                                                             selectedChallengeOptionId,
                                                             sacrificeInvestmentId,
                                                             doubleDownOnInvestmentId,
                                                             onChallengeSelect,
                                                             onSacrificeChange,
                                                             onDoubleDownChange,
                                                             isSubmitting
                                                         }) => {
    const handleChallengeSelect = (optionId: string) => {
        onChallengeSelect(optionId);
    };

    return (
        <div className="space-y-4">
            {/* Compact Yes/No Options */}
            <div className="space-y-3">
                {challengeOptions.map(opt => (
                    <div key={opt.id} className="space-y-3">
                        <button
                            onClick={() => handleChallengeSelect(opt.id)}
                            disabled={isSubmitting}
                            className={`w-full p-3 rounded-lg transition-all duration-200 border-2 text-left
                            ${selectedChallengeOptionId === opt.id ?
                                (opt.id === 'yes_dd' ?
                                    'bg-green-600 border-green-400 text-white shadow-lg' :
                                    'bg-red-600 border-red-400 text-white shadow-lg') :
                                'bg-gray-700 border-gray-500 text-gray-200 hover:bg-gray-600 hover:border-gray-400'}
                            focus:outline-none focus:ring-2 focus:ring-game-orange-500/50
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{opt.text}</span>
                                {opt.id === 'yes_dd' && <Dice6 className="w-5 h-5"/>}
                                {opt.id === 'no_dd' && <Shield className="w-5 h-5"/>}
                            </div>
                        </button>

                        {/* Inline expansion for Yes option */}
                        {selectedChallengeOptionId === opt.id && opt.id === 'yes_dd' && (
                            <div className="ml-4 space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Sacrifice Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            <div className="flex items-center gap-2">
                                                <Trash2 className="w-4 h-4"/>
                                                Sacrifice Investment
                                            </div>
                                        </label>
                                        <select
                                            value={sacrificeInvestmentId || ''}
                                            onChange={(e) => onSacrificeChange(e.target.value || null)}
                                            disabled={isSubmitting}
                                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white
                                                     focus:outline-none focus:ring-2 focus:ring-game-orange-500/50
                                                     disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">Select investment to remove</option>
                                            {availableRd3Investments.map(investment => (
                                                <option key={investment.id} value={investment.id}>
                                                    {investment.name.split('.')[0]} ({formatCurrency(investment.cost)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Double Down Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            <div className="flex items-center gap-2">
                                                <Target className="w-4 h-4"/>
                                                Double Down Investment
                                            </div>
                                        </label>
                                        <select
                                            value={doubleDownOnInvestmentId || ''}
                                            onChange={(e) => onDoubleDownChange(e.target.value || null)}
                                            disabled={isSubmitting}
                                            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white
                                                     focus:outline-none focus:ring-2 focus:ring-game-orange-500/50
                                                     disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">Select investment to double</option>
                                            {availableRd3Investments
                                                .filter(inv => inv.id !== sacrificeInvestmentId)
                                                .map(investment => (
                                                    <option key={investment.id} value={investment.id}>
                                                        {investment.name.split('.')[0]} ({formatCurrency(investment.cost)})
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Selection Summary */}
                                {sacrificeInvestmentId && doubleDownOnInvestmentId && (
                                    <div className="mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                                        <div className="text-sm text-gray-300">
                                            <div className="flex items-center justify-between">
                                                <span>Summary:</span>
                                                <span className="text-xs text-gray-400">Risk vs. Reward</span>
                                            </div>
                                            <div className="mt-2 flex items-center space-x-2 text-white">
                                                <span className="text-red-400">Remove:</span>
                                                <span>{availableRd3Investments.find(inv => inv.id === sacrificeInvestmentId)?.name.split('.')[0]}</span>
                                                <span className="text-gray-400">→</span>
                                                <span className="text-green-400">Double:</span>
                                                <span>{availableRd3Investments.find(inv => inv.id === doubleDownOnInvestmentId)?.name.split('.')[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DoubleDownPanel;
