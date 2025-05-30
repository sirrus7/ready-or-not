// src/components/Game/DecisionPanel/components/InvestmentPanel.tsx
import React from 'react';
import { InvestmentOption } from '../../../../types';

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

interface InvestmentPanelProps {
    investmentOptions: InvestmentOption[];
    selectedInvestmentIds: string[];
    spentBudget: number;
    investUpToBudget: number;
    onInvestmentToggle: (optionId: string, cost: number) => void;
    isSubmitting: boolean;
}

const InvestmentPanel: React.FC<InvestmentPanelProps> = ({
                                                             investmentOptions,
                                                             selectedInvestmentIds,
                                                             spentBudget,
                                                             investUpToBudget,
                                                             onInvestmentToggle,
                                                             isSubmitting
                                                         }) => {
    return (
        <div className="space-y-3">
            {investmentOptions.map((opt) => {
                const isSelected = selectedInvestmentIds.includes(opt.id);
                const canAfford = !isSelected && spentBudget + opt.cost <= investUpToBudget;
                const isDisabled = isSubmitting || (!isSelected && !canAfford);

                return (
                    <label
                        key={opt.id}
                        className={`flex items-center p-4 rounded-lg transition-all cursor-pointer border-2
                        ${isSelected
                            ? 'bg-blue-600/80 border-blue-400 text-white shadow-md'
                            : 'bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'
                        }
                        ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
                        `}
                    >
                        <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-blue-500 bg-gray-700 border-gray-500 rounded focus:ring-blue-400 focus:ring-offset-0 focus:ring-opacity-50 disabled:opacity-50 flex-shrink-0"
                            checked={isSelected}
                            onChange={() => onInvestmentToggle(opt.id, opt.cost)}
                            disabled={isDisabled}
                        />
                        <div className="ml-4 flex-grow min-w-0">
                            <div className="flex items-start justify-between">
                                <div className="flex-grow min-w-0 pr-2">
                                    <span className="text-sm font-medium block">{opt.name}</span>
                                    {opt.description && (
                                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                                            {opt.description}
                                        </p>
                                    )}
                                </div>
                                <span className={`text-sm font-semibold flex-shrink-0 ${
                                    isSelected ? 'text-blue-200' : 'text-yellow-300'
                                }`}>
                                    {formatCurrency(opt.cost)}
                                </span>
                            </div>
                        </div>
                    </label>
                );
            })}
        </div>
    );
};

export default InvestmentPanel;
