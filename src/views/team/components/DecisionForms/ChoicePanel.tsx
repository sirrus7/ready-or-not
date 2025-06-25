// src/views/team/components/DecisionForms/ChoicePanel.tsx
// REFACTORED: Pure component that receives forced selection state as props

import React from 'react';
import {ChallengeOption, Slide} from '@shared/types';
import {MultiSelectChallengeTracker} from '@core/game/MultiSelectChallengeTracker';

const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return `${value.toFixed(0)}`;
};

interface ChoicePanelProps {
    challengeOptions: ChallengeOption[];
    selectedChallengeOptionId: string | null;
    onChallengeSelect: (optionId: string) => void;
    currentSlide: Slide;
    isSubmitting: boolean;
    // NEW: Forced selection props computed by parent
    forcedSelection?: string | null;
    forcedSelectionReason?: string | null;
    isCheckingForcedSelection?: boolean;
}

const ChoicePanel: React.FC<ChoicePanelProps> = ({
                                                     challengeOptions,
                                                     selectedChallengeOptionId,
                                                     onChallengeSelect,
                                                     currentSlide,
                                                     isSubmitting,
                                                     forcedSelection,
                                                     forcedSelectionReason,
                                                     isCheckingForcedSelection = false
                                                 }) => {
    // Determine if this is a multi-select challenge
    const challengeId = currentSlide.interactive_data_key;
    const isMultiSelect = challengeId ? MultiSelectChallengeTracker.isMultiSelectChallenge(challengeId) : false;

    // Parse current selections (for multi-select challenges)
    const selectedOptions: string[] = isMultiSelect
        ? MultiSelectChallengeTracker.parseSelection(selectedChallengeOptionId)
        : (selectedChallengeOptionId ? [selectedChallengeOptionId] : []);

    // Handle selection for multi-select challenges
    const handleMultiSelectChange = (optionId: string, isChecked: boolean) => {
        // Don't allow changes if there's a forced selection
        if (forcedSelection) return;

        let newSelection: string[];

        if (isChecked) {
            newSelection = [...selectedOptions, optionId].filter((value, index, array) => array.indexOf(value) === index);
        } else {
            newSelection = selectedOptions.filter(id => id !== optionId);
        }

        // Validate combination is allowed
        if (challengeId && newSelection.length > 0) {
            const isValidCombo = MultiSelectChallengeTracker.isValidCombination(challengeId, newSelection);
            if (!isValidCombo) {
                return;
            }
        }

        const selectionString = newSelection.length > 0 ?
            MultiSelectChallengeTracker.formatSelection(newSelection) : '';
        onChallengeSelect(selectionString);
    };

    // Handle single selection (radio button)
    const handleSingleSelect = (optionId: string) => {
        // Don't allow changes if there's a forced selection
        if (forcedSelection) return;

        onChallengeSelect(optionId);
    };

    // Check if a combination would be valid
    const wouldBeValidCombination = (optionId: string): boolean => {
        if (!isMultiSelect || !challengeId) return true;

        const testSelection = selectedOptions.includes(optionId)
            ? selectedOptions.filter(id => id !== optionId)
            : [...selectedOptions, optionId];

        return testSelection.length === 0 ||
            MultiSelectChallengeTracker.isValidCombination(challengeId, testSelection);
    };

    // Show loading state while checking forced selection
    if (isCheckingForcedSelection) {
        return (
            <div className="space-y-3">
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <p className="text-gray-300">Checking decision requirements...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Forced Selection Alert */}
            {forcedSelection && (
                <div className="bg-green-900/30 border border-green-400 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                        <div className="text-green-400 text-xl">🛡️</div>
                        <div>
                            <p className="text-green-200 font-semibold">Automatic Selection Active</p>
                            <p className="text-green-300 text-sm mt-1">
                                {forcedSelectionReason || `You are automatically assigned Option ${forcedSelection} based on your previous investments.`}
                            </p>
                            <p className="text-green-400 text-xs mt-2 font-medium">
                                Option {forcedSelection} has been selected automatically. Other options are disabled.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Multi-select instruction (only if not forced) */}
            {isMultiSelect && !forcedSelection && (
                <div className="bg-blue-900/30 border border-blue-400 rounded-lg p-3 mb-4">
                    <p className="text-blue-200 text-sm">
                        💡 <strong>Special Challenge:</strong> You can select multiple options for this challenge.
                        Valid combinations: A, B, C, D individually, or A+C, B+C together.
                    </p>
                </div>
            )}

            {challengeOptions.map((opt) => {
                const isSelected = selectedOptions.includes(opt.id);
                const wouldBeValid = wouldBeValidCombination(opt.id);
                const isDisabledByForced = forcedSelection && opt.id !== forcedSelection;
                const isDisabled = isSubmitting || (!isSelected && !wouldBeValid) || isDisabledByForced;

                return (
                    <label
                        key={opt.id}
                        className={`flex items-start p-4 rounded-lg transition-all border-2 ${
                            isDisabled && !isSelected
                                ? 'cursor-not-allowed opacity-50 bg-gray-700/50 border-gray-600'
                                : forcedSelection && isSelected
                                    ? 'cursor-not-allowed bg-green-600/80 border-green-400 text-white shadow-md'
                                    : isSelected
                                        ? 'bg-blue-600/80 border-blue-400 text-white shadow-md'
                                        : 'cursor-pointer bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'
                        }`}
                    >
                        {isMultiSelect ? (
                            // Checkbox for multi-select challenges
                            <input
                                type="checkbox"
                                name={`challengeOption-${currentSlide.id}`}
                                className="form-checkbox h-5 w-5 text-blue-500 mt-1 bg-gray-700 border-gray-500 focus:ring-blue-400 focus:ring-offset-0 focus:ring-opacity-50 flex-shrink-0 rounded"
                                checked={isSelected}
                                onChange={(e) => handleMultiSelectChange(opt.id, e.target.checked)}
                                disabled={isDisabled}
                            />
                        ) : (
                            // Radio button for single-select challenges
                            <input
                                type="radio"
                                name={`challengeOption-${currentSlide.id}`}
                                className="form-radio h-5 w-5 text-blue-500 mt-1 bg-gray-700 border-gray-500 focus:ring-blue-400 focus:ring-offset-0 focus:ring-opacity-50 flex-shrink-0"
                                checked={selectedChallengeOptionId === opt.id}
                                onChange={() => handleSingleSelect(opt.id)}
                                disabled={isDisabled}
                            />
                        )}

                        <div className="ml-4 text-sm flex-grow">
                            <div className="leading-relaxed">
                                <span className="font-semibold">{opt.id}.</span>
                                {opt.text}

                                {/* Special indicators */}
                                {opt.id === 'C' && isMultiSelect && (
                                    <span className="ml-2 text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded-full">
                                        BONUS
                                    </span>
                                )}
                                {forcedSelection === opt.id && (
                                    <span className="ml-2 text-xs bg-green-600 text-green-100 px-2 py-1 rounded-full">
                                        AUTO-SELECTED
                                    </span>
                                )}
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
                );
            })}

            {/* Selection summary for multi-select */}
            {isMultiSelect && selectedOptions.length > 0 && !forcedSelection && (
                <div className="bg-green-900/30 border border-green-400 rounded-lg p-3 mt-4">
                    <p className="text-green-200 text-sm">
                        <strong>Current
                            Selection:</strong> {MultiSelectChallengeTracker.getCombinationDisplayText(selectedOptions)}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ChoicePanel;
