// src/components/Game/DecisionPanel/components/DoubleDownPromptPanel.tsx
import React from 'react';
import { ChallengeOption } from '../../../../types';

interface DoubleDownPromptPanelProps {
    challengeOptions: ChallengeOption[];
    selectedChallengeOptionId: string | null;
    onChallengeSelect: (optionId: string) => void;
}

const DoubleDownPromptPanel: React.FC<DoubleDownPromptPanelProps> = ({
                                                                         challengeOptions,
                                                                         selectedChallengeOptionId,
                                                                         onChallengeSelect
                                                                     }) => {
    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Double Down Opportunity!</h3>
                <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                    You can sacrifice one of your RD-3 investments to double the potential payoff (or risk!) of another RD-3
                    investment. This outcome is influenced by a dice roll.
                </p>
            </div>

            <div className="space-y-3">
                {challengeOptions.map(opt => (
                    <label
                        key={opt.id}
                        className={`flex items-center p-4 rounded-lg transition-all cursor-pointer border-2 
                        ${selectedChallengeOptionId === opt.id ?
                            (opt.id === 'yes_dd' ? 'bg-green-600/80 border-green-400' : 'bg-red-600/80 border-red-400') :
                            'bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'}
                         text-white`}
                    >
                        <input
                            type="radio"
                            name="doubleDownOption"
                            value={opt.id}
                            checked={selectedChallengeOptionId === opt.id}
                            onChange={(e) => onChallengeSelect(e.target.value)}
                            className={`form-radio h-5 w-5 ${
                                opt.id === 'yes_dd' ? 'text-green-500' : 'text-red-500'
                            } flex-shrink-0`}
                        />
                        <span className="ml-4 text-sm font-medium">{opt.text}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default DoubleDownPromptPanel;
