// src/components/Game/DecisionPanel/components/ChoicePanel.tsx
import React from 'react';
import {ChallengeOption, GamePhaseNode} from '@shared/types/common';

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

interface ChoicePanelProps {
    challengeOptions: ChallengeOption[];
    selectedChallengeOptionId: string | null;
    onChallengeSelect: (optionId: string) => void;
    currentPhase: GamePhaseNode;
    isSubmitting: boolean;
}

const ChoicePanel: React.FC<ChoicePanelProps> = ({
                                                     challengeOptions,
                                                     selectedChallengeOptionId,
                                                     onChallengeSelect,
                                                     currentPhase,
                                                     isSubmitting
                                                 }) => {
    return (
        <div className="space-y-3">
            {challengeOptions.map((opt) => (
                <label
                    key={opt.id}
                    className={`flex items-start p-4 rounded-lg transition-all cursor-pointer border-2
                    ${selectedChallengeOptionId === opt.id
                        ? 'bg-blue-600/80 border-blue-400 text-white shadow-md'
                        : 'bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'
                    }`}
                >
                    <input
                        type="radio"
                        name={`challengeOption-${currentPhase.id}`}
                        className="form-radio h-5 w-5 text-blue-500 mt-1 bg-gray-700 border-gray-500 focus:ring-blue-400 focus:ring-offset-0 focus:ring-opacity-50 flex-shrink-0"
                        checked={selectedChallengeOptionId === opt.id}
                        onChange={() => onChallengeSelect(opt.id)}
                        disabled={isSubmitting}
                    />
                    <div className="ml-4 text-sm flex-grow">
                        <div className="leading-relaxed">
                            <span className="font-semibold">{opt.id}. </span>{opt.text}
                        </div>
                        {opt.estimated_cost !== undefined && (
                            <div className="text-xs opacity-80 mt-2 bg-gray-700/50 rounded px-2 py-1 inline-block">
                                Cost/Savings: {formatCurrency(opt.estimated_cost)}
                            </div>
                        )}
                        {opt.immediate_kpi_impact_preview && (
                            <p className="text-xs text-sky-300 mt-2 bg-sky-900/30 rounded px-2 py-1">
                                Preview: {opt.immediate_kpi_impact_preview}
                            </p>
                        )}
                    </div>
                </label>
            ))}
        </div>
    );
};

export default ChoicePanel;
