// src/components/StudentGame/DecisionPanel.tsx
import React, {useState, useEffect, useMemo} from 'react';
import {InvestmentOption, ChallengeOption, GamePhaseNode} from '../../types';
import {AlertTriangle, CheckCircle, Hourglass} from 'lucide-react';
import Modal from '../UI/Modal';

interface DecisionPanelProps {
    sessionId: string | null;
    teamId: string | null;
    currentPhase: GamePhaseNode | null;
    investmentOptions?: InvestmentOption[];
    investUpToBudget?: number;
    challengeOptions?: ChallengeOption[];
    availableRd3Investments?: InvestmentOption[];
    onDecisionSubmit: (decisionData: any) => void;
    isDecisionTime: boolean;
    timeRemainingSeconds?: number;
    currentSpentBudgetForInvestments?: number;
    onInvestmentSelectionChange?: (selectedIds: string[], totalCost: number) => void;
}

const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`; // Adjusted to 1 decimal for M
    }
    if (Math.abs(value) >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
};

const DecisionPanel: React.FC<DecisionPanelProps> = ({
                                                         sessionId,
                                                         teamId,
                                                         currentPhase,
                                                         investmentOptions = [],
                                                         investUpToBudget = 0,
                                                         challengeOptions = [],
                                                         availableRd3Investments = [],
                                                         onDecisionSubmit,
                                                         isDecisionTime,
                                                         timeRemainingSeconds,
                                                         onInvestmentSelectionChange,
                                                     }) => {
    const [selectedInvestmentIds, setSelectedInvestmentIds] = useState<string[]>([]);
    const [spentBudget, setSpentBudget] = useState<number>(0); // Initialize to 0, parent can pass initial if needed

    const [selectedChallengeOptionId, setSelectedChallengeOptionId] = useState<string | null>(null);

    const [sacrificeInvestmentId, setSacrificeInvestmentId] = useState<string | null>(null);
    const [doubleDownOnInvestmentId, setDoubleDownOnInvestmentId] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);

    const remainingBudget = useMemo(() => investUpToBudget - spentBudget, [investUpToBudget, spentBudget]);

    // Effect to initialize/reset state when the phase or options change
    useEffect(() => {
        console.log(`[DecisionPanel] Phase changed to: ${currentPhase?.id}, type: ${currentPhase?.phase_type}`);
        setSelectedInvestmentIds([]);
        setSpentBudget(0); // Reset spent budget for new phase

        if (currentPhase?.phase_type === 'choice' && challengeOptions.length > 0) {
            const defaultChoice = challengeOptions.find(opt => opt.is_default_choice);
            setSelectedChallengeOptionId(defaultChoice?.id || challengeOptions[challengeOptions.length - 1].id);
        } else if (currentPhase?.phase_type === 'double-down-prompt' && challengeOptions.length > 0) {
            // Assuming 'no_dd' is the default for the prompt
            const defaultOptOut = challengeOptions.find(opt => opt.id === 'no_dd') || challengeOptions.find(opt => opt.is_default_choice);
            setSelectedChallengeOptionId(defaultOptOut?.id || null);
        } else {
            setSelectedChallengeOptionId(null);
        }
        setSacrificeInvestmentId(null);
        setDoubleDownOnInvestmentId(null);
        setSubmitError(null); // Clear errors on phase change
        // Note: currentSpentBudgetForInvestments prop could be used here if we need to load saved state
    }, [currentPhase, challengeOptions, investUpToBudget]); // Removed investmentOptions from deps, as it's handled by spentBudget reset


    // Effect to call onInvestmentSelectionChange when selections change
    useEffect(() => {
        if (currentPhase?.phase_type === 'invest' && onInvestmentSelectionChange) {
            onInvestmentSelectionChange(selectedInvestmentIds, spentBudget);
        }
    }, [selectedInvestmentIds, spentBudget, currentPhase, onInvestmentSelectionChange]);


    const handleInvestmentToggle = (optionId: string, cost: number) => {
        const currentIndex = selectedInvestmentIds.indexOf(optionId);
        const newSelectedIds = [...selectedInvestmentIds];
        let newSpentBudget = spentBudget;

        if (currentIndex === -1) {
            if (newSpentBudget + cost <= investUpToBudget) {
                newSelectedIds.push(optionId);
                newSpentBudget += cost;
            } else {
                setSubmitError("Cannot exceed budget! Deselect an item or choose a cheaper one.");
                setTimeout(() => setSubmitError(null), 3000);
                return;
            }
        } else {
            newSelectedIds.splice(currentIndex, 1);
            newSpentBudget -= cost;
        }
        setSelectedInvestmentIds(newSelectedIds);
        setSpentBudget(newSpentBudget);
        if(submitError) setSubmitError(null); // Clear error if action was successful
    };

    const handleChallengeSelect = (optionId: string) => {
        setSelectedChallengeOptionId(optionId);
    };

    const handleSubmitClick = () => {
        setSubmitError(null); // Clear previous errors
        if (currentPhase?.phase_type === 'double-down-prompt') {
            // This decision is handled by CompanyDisplayPage calling onDecisionSubmit directly
            // with { wantsToDoubleDown: true/false } based on selectedChallengeOptionId
            // This component's submit button shouldn't directly submit for this specific type.
            // Instead, CompanyDisplayPage would interpret selectedChallengeOptionId
            // and call onDecisionSubmit with the appropriate payload.
            // For now, we assume onDecisionSubmit handles this logic if called.
            onDecisionSubmit({ wantsToDoubleDown: selectedChallengeOptionId === 'yes_dd' });
            return;
        }
        if (currentPhase?.phase_type === 'double-down-select' && (!sacrificeInvestmentId || !doubleDownOnInvestmentId)) {
            setSubmitError("Please select an investment to sacrifice AND one to double down on.");
            return;
        }
        setShowConfirmationModal(true);
    };

    const confirmSubmit = async () => {
        setShowConfirmationModal(false);
        if (!currentPhase || !sessionId || !teamId) {
            setSubmitError("Session or Team ID missing, or no active phase.");
            return;
        }
        setIsSubmitting(true);
        setSubmitError(null);

        const decisionPayload: any = {}; // Payload to be passed to CompanyDisplayPage's onDecisionSubmit

        if (currentPhase.phase_type === 'invest') {
            decisionPayload.selected_investment_ids = selectedInvestmentIds;
            decisionPayload.total_spent_budget = spentBudget;
        } else if (currentPhase.phase_type === 'choice') {
            if (!selectedChallengeOptionId) {
                setSubmitError("Please make a selection for the challenge.");
                setIsSubmitting(false);
                return;
            }
            decisionPayload.selected_challenge_option_id = selectedChallengeOptionId;
        } else if (currentPhase.phase_type === 'double-down-select') {
            if (!sacrificeInvestmentId || !doubleDownOnInvestmentId) {
                setSubmitError("Both sacrifice and double-down selections are required.");
                setIsSubmitting(false);
                return;
            }
            decisionPayload.double_down_decision = {
                investmentToSacrificeId: sacrificeInvestmentId,
                investmentToDoubleDownId: doubleDownOnInvestmentId,
            };
        } else {
            setSubmitError("Unknown decision type for submission.");
            setIsSubmitting(false);
            return;
        }

        // Call the parent's submission handler
        onDecisionSubmit(decisionPayload);
        // Parent (CompanyDisplayPage) will handle actual DB insert and further state updates (submissionStatus, etc.)
        setIsSubmitting(false); // Reset local submitting state, parent handles global
    };


    if (!isDecisionTime || !currentPhase) {
        // This component will likely be conditionally rendered by CompanyDisplayPage,
        // so this state might not be hit often if CompanyDisplayPage handles the "waiting" display.
        return (
            <div className="p-6 bg-gray-800 text-gray-400 text-center rounded-xl min-h-[200px] flex flex-col items-center justify-center">
                <Hourglass size={32} className="mr-2 animate-pulse mb-3"/>
                <p className="text-lg">Waiting for Decision Period</p>
                {currentPhase && <p className="text-xs mt-1">Current Phase: {currentPhase.label}</p>}
            </div>
        );
    }

    const formatTime = (seconds: number | undefined): string => {
        if (seconds === undefined || seconds < 0) return "00:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const renderInvestmentPanel = () => (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">RD-{currentPhase?.round_number} Investments</h3>
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-300 mb-2">Budget: <span className="font-bold text-green-400">{formatCurrency(investUpToBudget)}</span></p>
                    <div className="flex justify-between text-sm">
                        <p className="text-gray-300">Spent: <span className="font-semibold text-yellow-400">{formatCurrency(spentBudget)}</span></p>
                        <p className={`font-semibold ${remainingBudget < 0 ? 'text-red-400' : 'text-blue-400'}`}>Remaining: {formatCurrency(remainingBudget)}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {investmentOptions.map((opt) => (
                    <label
                        key={opt.id}
                        className={`flex items-center p-4 rounded-lg transition-all cursor-pointer border-2
                        ${selectedInvestmentIds.includes(opt.id)
                            ? 'bg-blue-600/80 border-blue-400 text-white shadow-md'
                            : 'bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'
                        }
                        ${(!selectedInvestmentIds.includes(opt.id) && spentBudget + opt.cost > investUpToBudget) ? 'opacity-60 cursor-not-allowed' : ''}
                        `}
                    >
                        <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-blue-500 bg-gray-700 border-gray-500 rounded focus:ring-blue-400 focus:ring-offset-0 focus:ring-opacity-50 disabled:opacity-50 flex-shrink-0"
                            checked={selectedInvestmentIds.includes(opt.id)}
                            onChange={() => handleInvestmentToggle(opt.id, opt.cost)}
                            disabled={isSubmitting || (!selectedInvestmentIds.includes(opt.id) && spentBudget + opt.cost > investUpToBudget)}
                        />
                        <div className="ml-4 flex-grow min-w-0">
                            <div className="flex items-start justify-between">
                                <div className="flex-grow min-w-0 pr-2">
                                    <span className="text-sm font-medium block">{opt.name}</span>
                                    {opt.description && <p className="text-xs text-gray-300 mt-1 leading-relaxed">{opt.description}</p>}
                                </div>
                                <span className={`text-sm font-semibold flex-shrink-0 ${selectedInvestmentIds.includes(opt.id) ? 'text-blue-200' : 'text-yellow-300'}`}>
                                    {formatCurrency(opt.cost)}
                                </span>
                            </div>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );

    const renderChoicePanel = () => (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">{currentPhase?.label || "Make Your Choice"}</h3>
                {currentPhase?.sub_label && <p className="text-sm text-gray-400 mb-4">Event: {currentPhase.sub_label}</p>}
            </div>

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
                            name={`challengeOption-${currentPhase?.id}`} // Ensure unique name per phase group
                            className="form-radio h-5 w-5 text-blue-500 mt-1 bg-gray-700 border-gray-500 focus:ring-blue-400 focus:ring-offset-0 focus:ring-opacity-50 flex-shrink-0"
                            checked={selectedChallengeOptionId === opt.id}
                            onChange={() => handleChallengeSelect(opt.id)}
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
                                <p className="text-xs text-sky-300 mt-2 bg-sky-900/30 rounded px-2 py-1">Preview: {opt.immediate_kpi_impact_preview}</p>
                            )}
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );

    const renderDoubleDownPromptPanel = () => (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Double Down Opportunity!</h3>
                <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                    You can sacrifice one of your RD-3 investments to double the potential payoff (or risk!) of another RD-3
                    investment. This outcome is influenced by a dice roll.
                </p>
            </div>

            <div className="space-y-3">
                {challengeOptions.map(opt => ( // Expects 'yes_dd' and 'no_dd' options
                    <label
                        key={opt.id}
                        className={`flex items-center p-4 rounded-lg transition-all cursor-pointer border-2 
                        ${selectedChallengeOptionId === opt.id ?
                            (opt.id === 'yes_dd' ? 'bg-green-600/80 border-green-400' : 'bg-red-600/80 border-red-400') :
                            'bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'}
                         text-white`}
                    >
                        <input type="radio" name="doubleDownOption" value={opt.id}
                               checked={selectedChallengeOptionId === opt.id}
                               onChange={(e) => setSelectedChallengeOptionId(e.target.value)}
                               className={`form-radio h-5 w-5 ${opt.id === 'yes_dd' ? 'text-green-500' : 'text-red-500'} flex-shrink-0`}/>
                        <span className="ml-4 text-sm font-medium">{opt.text}</span>
                    </label>
                ))}
            </div>
        </div>
    );

    const renderDoubleDownSelectPanel = () => (
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
                        onChange={(e) => setSacrificeInvestmentId(e.target.value)}
                        className="w-full px-3 py-3 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                        disabled={isSubmitting}
                    >
                        <option value="" disabled>Select investment to remove</option>
                        {availableRd3Investments.map(opt => (
                            <option key={`sac-${opt.id}`} value={opt.id} disabled={opt.id === doubleDownOnInvestmentId}>
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
                        onChange={(e) => setDoubleDownOnInvestmentId(e.target.value)}
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

    const renderContent = () => {
        if (!currentPhase) return null;
        switch (currentPhase.phase_type) {
            case 'invest': return renderInvestmentPanel();
            case 'choice': return renderChoicePanel();
            case 'double-down-prompt': return renderDoubleDownPromptPanel();
            case 'double-down-select': return renderDoubleDownSelectPanel();
            default: return <p className="text-gray-400 text-center py-8">Waiting for interactive phase instructions...</p>;
        }
    };

    let isSubmitDisabled = isSubmitting;
    if (currentPhase?.phase_type === 'invest' && selectedInvestmentIds.length === 0 && investUpToBudget > 0) {
        // Allow submitting zero investments if budget itself is zero, otherwise require selection.
        // This can be refined further if "submitting 0" is always allowed.
    } else if (currentPhase?.phase_type === 'choice' && !selectedChallengeOptionId) {
        isSubmitDisabled = true;
    } else if (currentPhase?.phase_type === 'double-down-prompt' && !selectedChallengeOptionId) {
        isSubmitDisabled = true;
    } else if (currentPhase?.phase_type === 'double-down-select' && (!sacrificeInvestmentId || !doubleDownOnInvestmentId)) {
        isSubmitDisabled = true;
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm text-white rounded-xl shadow-2xl border border-gray-700">
            <div className="p-4 md:p-6">
                {renderContent()}

                {submitError && (
                    <div className="mt-4 p-3 bg-red-500/30 text-red-300 border border-red-500/50 rounded-md text-sm">
                        <AlertTriangle size={16} className="inline mr-2"/> {submitError}
                    </div>
                )}
            </div>

            {/* Fixed footer for timer and submit button */}
            <div className="border-t border-gray-700 bg-gray-800/80 rounded-b-xl p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {timeRemainingSeconds !== undefined && (
                        <div className={`text-lg font-mono px-4 py-2 rounded-lg ${timeRemainingSeconds <= 60 ? 'text-red-400 bg-red-900/30 animate-pulse' : 'text-yellow-400 bg-yellow-900/30'}`}>
                            <Hourglass size={18} className="inline mr-2 relative -top-px"/>
                            Time: {formatTime(timeRemainingSeconds)}
                        </div>
                    )}
                    <button
                        onClick={handleSubmitClick}
                        disabled={isSubmitDisabled}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[200px]"
                    >
                        {isSubmitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <CheckCircle size={20}/>
                        )}
                        Submit Decisions
                    </button>
                </div>
            </div>

            <Modal
                isOpen={showConfirmationModal}
                onClose={() => setShowConfirmationModal(false)}
                title="Confirm Submission"
                size="sm"
            >
                <div className="p-2">
                    <p className="text-sm text-gray-600 mb-4">Are you sure you want to submit these decisions for {currentPhase?.label || "this phase"}? This action cannot be undone.</p>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => setShowConfirmationModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmSubmit}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                        >
                            Yes, Submit
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DecisionPanel;