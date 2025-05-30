// src/components/Game/DecisionPanel/components/DecisionHeader.tsx
import React from 'react';
import { GamePhaseNode } from '../../../../types';
import { DecisionState } from '../hooks/useDecisionLogic';

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

interface DecisionHeaderProps {
    currentPhase: GamePhaseNode;
    decisionState: DecisionState;
    investUpToBudget: number;
}

const DecisionHeader: React.FC<DecisionHeaderProps> = ({
                                                           currentPhase,
                                                           decisionState,
                                                           investUpToBudget
                                                       }) => {
    const remainingBudget = investUpToBudget - decisionState.spentBudget;

    if (currentPhase.phase_type !== 'invest') {
        return (
            <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">
                    {currentPhase.label || "Make Your Decision"}
                </h3>
                {currentPhase.sub_label && (
                    <p className="text-sm text-gray-400 mb-4">Event: {currentPhase.sub_label}</p>
                )}
            </div>
        );
    }

    return (
        <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">
                RD-{currentPhase.round_number} Investments
            </h3>
            <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-300 mb-2">
                    Budget: <span className="font-bold text-green-400">{formatCurrency(investUpToBudget)}</span>
                </p>
                <div className="flex justify-between text-sm">
                    <p className="text-gray-300">
                        Spent: <span className="font-semibold text-yellow-400">{formatCurrency(decisionState.spentBudget)}</span>
                    </p>
                    <p className={`font-semibold ${remainingBudget < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        Remaining: {formatCurrency(remainingBudget)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DecisionHeader;
