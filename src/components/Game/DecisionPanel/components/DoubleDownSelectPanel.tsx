// src/components/Game/DecisionPanel/components/DoubleDownSelectPanel.tsx
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

interface DoubleDownSelectPanelProps {
    availableRd3Investments: InvestmentOption[];
    sacrificeInvestmentId: string | null;
    doubleDownOnInvestmentId: string | null;
    onSacrificeChange: (id: string | null) => void;
    onDoubleDownChange: (id: string | null) => void;
    isSubmitting: boolean;
}

const DoubleDownSelectPanel: React.FC<DoubleDownSelectPanelProps> = ({
                                                                         availableRd3Investments,
                                                                         sacrificeInvestmentId,
                                                                         doubleDownOnInvestmentId,
                                                                         onSacrificeChange,
                                                                         onDoubleDownChange,
                                                                         isSubmitting
                                                                     }) => {
    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Select Your Double Down</h3>
                <p className="text-sm text-gray-400 mb-4">You chose to double down! Make your selections below.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label htmlFor="sacrifice-select" className="block text-sm font-medium text-gray-300 mb-2">
                        1. Sacrifice one RD-3 Investment:
                    </label>
                    <select
                        id="sacrifice-select"
                        value={sacrificeInvestmentId || ''}
                        onChange={(e) => onSacrificeChange(e.target.value)}
                        className="w-full px-3 py-3 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
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

                <div>
                    <label htmlFor="double-down-select" className="block text-sm font-medium text-gray-300 mb-2">
                        2. Double Down on another RD-3 Investment:
                    </label>
                    <select
                        id="double-down-select"
                        value={doubleDownOnInvestmentId || ''}
                        onChange={(e) => onDoubleDownChange(e.target.value)}
                        className="w-full px-3 py-3 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
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
            </div>
        </div>
    );
};

export default DoubleDownSelectPanel;
