// src/views/team/components/DecisionForms/DoubleDownPanel.tsx
import React from 'react';
import {InvestmentOption, ChallengeOption} from '@shared/types';

const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
};

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
        // No auto-submit - let user manually submit their choice
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Double Down Opportunity!</h3>
                <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                    You can sacrifice one of your RD-3 investments to double the potential payoff (or risk!) of another
                    RD-3 investment. This outcome is influenced by a dice roll.
                </p>
            </div>

            {/* Step 1: Yes/No Choice */}
            <div className="space-y-4">
                {challengeOptions.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => handleChallengeSelect(opt.id)}
                        disabled={isSubmitting}
                        className={`w-full p-6 rounded-lg transition-all duration-200 border-2 text-left
                        ${selectedChallengeOptionId === opt.id ?
                            (opt.id === 'yes_dd' ?
                                'bg-green-600 border-green-400 text-white shadow-lg transform scale-[1.02]' :
                                'bg-red-600 border-red-400 text-white shadow-lg transform scale-[1.02]') :
                            'bg-gray-700 border-gray-500 text-gray-200 hover:bg-gray-600 hover:border-gray-400 hover:scale-[1.01]'}
                        focus:outline-none focus:ring-4 focus:ring-game-orange-500/50
                        disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-medium">{opt.text}</span>
                            {opt.id === 'yes_dd' && <span className="text-2xl">🎲</span>}
                            {opt.id === 'no_dd' && <span className="text-2xl">🛡️</span>}
                        </div>
                        {opt.id === 'yes_dd' && (
                            <p className="text-sm text-green-100 mt-2 opacity-90">
                                Take a risk for potentially double rewards!
                            </p>
                        )}
                        {opt.id === 'no_dd' && (
                            <p className="text-sm text-red-100 mt-2 opacity-90">
                                Play it safe and keep your current investments.
                            </p>
                        )}
                    </button>
                ))}
            </div>

            {/* Step 2: Investment Selection (only shown if "Yes" selected) */}
            {selectedChallengeOptionId === 'yes_dd' && (
                <div className="border-t border-gray-600 pt-6">
                    <div className="text-center mb-4">
                        <h4 className="text-lg font-semibold text-white">Make Your Selections</h4>
                        <p className="text-sm text-gray-400">Choose which investment to sacrifice and which to double
                            down on.</p>
                    </div>

                    <div className="space-y-4">
                        {/* Sacrifice Selection */}
                        <div>
                            <label htmlFor="sacrifice-select" className="block text-sm font-medium text-gray-300 mb-2">
                                1. Sacrifice one RD-3 Investment:
                            </label>
                            <select
                                id="sacrifice-select"
                                value={sacrificeInvestmentId || ''}
                                onChange={(e) => onSacrificeChange(e.target.value)}
                                className="w-full px-3 py-3 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-game-orange-500 focus:border-game-orange-500"
                                disabled={isSubmitting}
                            >
                                <option value="" disabled>Select investment to remove</option>
                                {availableRd3Investments.map(opt => (
                                    <option
                                        key={`sac-${opt.id}`}
                                        value={opt.id}
                                        disabled={opt.id === doubleDownOnInvestmentId}
                                    >
                                        {opt.name} ({formatCurrency(opt.cost)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Double Down Selection - only show after sacrifice selection */}
                        {sacrificeInvestmentId && (
                            <div>
                                <label htmlFor="double-down-select"
                                       className="block text-sm font-medium text-gray-300 mb-2">
                                    2. Double Down on another RD-3 Investment:
                                </label>
                                <select
                                    id="double-down-select"
                                    value={doubleDownOnInvestmentId || ''}
                                    onChange={(e) => onDoubleDownChange(e.target.value)}
                                    className="w-full px-3 py-3 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-game-orange-500 focus:border-game-orange-500"
                                    disabled={isSubmitting}
                                >
                                    <option value="" disabled>Select investment to double down on</option>
                                    {availableRd3Investments
                                        .filter(opt => opt.id !== sacrificeInvestmentId)
                                        .map(opt => (
                                            <option key={`dd-${opt.id}`} value={opt.id}>
                                                {opt.name} ({formatCurrency(opt.cost)})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoubleDownPanel;
