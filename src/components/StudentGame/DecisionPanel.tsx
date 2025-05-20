// src/components/StudentGame/DecisionPanel.tsx
import React, {useState, useEffect, useMemo} from 'react';
import {InvestmentOption, ChallengeOption, KpiEffect, GamePhaseNode} from '../../types';
import {AlertTriangle, CheckCircle, DollarSign, HelpCircle, Hourglass, ListChecks, Repeat} from 'lucide-react';
import {supabase} from '../../lib/supabase'; // For submitting decisions
import Modal from '../UI/Modal'; // Using the generic Modal

interface DecisionPanelProps {
    sessionId: string | null;
    teamId: string | null;
    currentPhase: GamePhaseNode | null; // Current game phase from teacher
    // Data specific to the current decision type
    investmentOptions?: InvestmentOption[];
    investUpToBudget?: number;
    challengeOptions?: ChallengeOption[];
    // For double down
    availableRd3Investments?: InvestmentOption[]; // Investments made in RD-3
    onDecisionSubmit: (decisionData: any) => void; // Callback when student submits
    isDecisionTime: boolean; // Is it currently time for decisions?
    timeRemainingSeconds?: number; // Timer countdown
    currentSpentBudgetForInvestments?: number; // Pass this if pre-calculated
    onInvestmentSelectionChange?: (selectedIds: string[], totalCost: number) => void; // For parent to track budget
}

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
                                                         currentSpentBudgetForInvestments = 0,
                                                         onInvestmentSelectionChange,
                                                     }) => {
    // Investment State
    const [selectedInvestmentIds, setSelectedInvestmentIds] = useState<string[]>([]);
    const [spentBudget, setSpentBudget] = useState<number>(currentSpentBudgetForInvestments);
    const [remainingBudget, setRemainingBudget] = useState<number>(investUpToBudget - currentSpentBudgetForInvestments);

    // Challenge State
    const [selectedChallengeOptionId, setSelectedChallengeOptionId] = useState<string | null>(null);

    // Double Down State
    const [sacrificeInvestmentId, setSacrificeInvestmentId] = useState<string | null>(null);
    const [doubleDownOnInvestmentId, setDoubleDownOnInvestmentId] = useState<string | null>(null);
    const [confirmDoubleDownModal, setConfirmDoubleDownModal] = useState(false);


    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);

    // Reset local state when phase changes or new options come in
    useEffect(() => {
        setSelectedInvestmentIds([]);
        setSpentBudget(0);
        setRemainingBudget(investUpToBudget);
        setSelectedChallengeOptionId(challengeOptions.find(opt => opt.is_default_choice)?.id || (challengeOptions.length > 0 ? challengeOptions[challengeOptions.length - 1].id : null)); // Default to 'Do Nothing'
        setSacrificeInvestmentId(null);
        setDoubleDownOnInvestmentId(null);
    }, [currentPhase, investmentOptions, challengeOptions, investUpToBudget]);

    useEffect(() => {
        if (currentPhase?.phase_type === 'invest' && onInvestmentSelectionChange) {
            onInvestmentSelectionChange(selectedInvestmentIds, spentBudget);
        }
    }, [selectedInvestmentIds, spentBudget, currentPhase, onInvestmentSelectionChange]);


    const handleInvestmentToggle = (optionId: string, cost: number) => {
        const currentIndex = selectedInvestmentIds.indexOf(optionId);
        let newSelectedIds = [...selectedInvestmentIds];
        let newSpentBudget = spentBudget;

        if (currentIndex === -1) { // Select
            if (newSpentBudget + cost <= investUpToBudget) {
                newSelectedIds.push(optionId);
                newSpentBudget += cost;
            } else {
                alert("Cannot exceed budget!"); // Simple alert for now
                return;
            }
        } else { // Deselect
            newSelectedIds.splice(currentIndex, 1);
            newSpentBudget -= cost;
        }
        setSelectedInvestmentIds(newSelectedIds);
        setSpentBudget(newSpentBudget);
        setRemainingBudget(investUpToBudget - newSpentBudget);
    };

    const handleChallengeSelect = (optionId: string) => {
        setSelectedChallengeOptionId(optionId);
    };

    const handleSubmitClick = () => {
        if (currentPhase?.phase_type === 'double-down-prompt') {
            if (selectedChallengeOptionId === 'yes_dd') { // Assuming 'yes_dd' and 'no_dd' as option IDs
                onDecisionSubmit({wantsToDoubleDown: true}); // Signal parent to move to DD selection phase
                return;
            } else {
                onDecisionSubmit({
                    wantsToDoubleDown: false,
                    phaseId: currentPhase.id,
                    decisionType: 'double-down-opt-out'
                });
                return;
            }
        }
        if (currentPhase?.phase_type === 'double-down-select' && (!sacrificeInvestmentId || !doubleDownOnInvestmentId)) {
            setSubmitError("Please select an investment to sacrifice and one to double down on.");
            return;
        }
        setShowConfirmationModal(true);
    };

    const confirmSubmit = async () => {
        setShowConfirmationModal(false);
        if (!currentPhase || !sessionId || !teamId) {
            setSubmitError("Session or Team ID missing.");
            return;
        }
        setIsSubmitting(true);
        setSubmitError(null);

        let decisionData: any = {
            session_id: sessionId,
            team_id: teamId,
            phase_id: currentPhase.id,
            round_number: currentPhase.round_number,
        };

        if (currentPhase.phase_type === 'invest') {
            decisionData.selected_investment_ids = selectedInvestmentIds;
            decisionData.total_spent_budget = spentBudget;
        } else if (currentPhase.phase_type === 'choice') {
            decisionData.selected_challenge_option_id = selectedChallengeOptionId;
        } else if (currentPhase.phase_type === 'double-down-select') {
            decisionData.double_down_decision = {
                investmentToSacrificeId: sacrificeInvestmentId,
                investmentToDoubleDownId: doubleDownOnInvestmentId,
            };
        }

        try {
            const {error} = await supabase.from('team_decisions').insert(decisionData);
            if (error) throw error;
            onDecisionSubmit(decisionData); // Notify parent of successful submission
        } catch (err) {
            console.error("Error submitting decision:", err);
            setSubmitError(err instanceof Error ? err.message : "Failed to submit decision.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-submit if timer runs out for choice phases
    useEffect(() => {
        if (isDecisionTime && timeRemainingSeconds === 0 && currentPhase?.phase_type === 'choice' && !showConfirmationModal && !isSubmitting) {
            console.log(`Auto-submitting for ${currentPhase.label} with option: ${selectedChallengeOptionId}`);
            confirmSubmit();
        }
    }, [timeRemainingSeconds, isDecisionTime, currentPhase, showConfirmationModal, isSubmitting, selectedChallengeOptionId]);


    const renderInvestmentPanel = () => (
        <>
            <h3 className="text-xl font-semibold text-white mb-1">RD-{currentPhase?.round_number} Investments</h3>
            <p className="text-sm text-gray-300 mb-1">Invest Up To: <span
                className="font-bold text-green-400">{formatCurrency(investUpToBudget)}</span></p>
            <div className="flex justify-between text-sm mb-3">
                <p className="text-gray-300">Spent: <span
                    className="font-semibold text-yellow-400">{formatCurrency(spentBudget)}</span></p>
                <p className="text-gray-300">Remaining: <span
                    className="font-semibold text-blue-400">{formatCurrency(remainingBudget)}</span></p>
            </div>
            <div
                className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
                {investmentOptions.map((opt) => (
                    <label
                        key={opt.id}
                        className={`flex items-center p-3 rounded-md transition-all cursor-pointer border-2
                        ${selectedInvestmentIds.includes(opt.id)
                            ? 'bg-blue-600/80 border-blue-400 text-white'
                            : 'bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'
                        }`}
                    >
                        <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-blue-500 bg-gray-700 border-gray-500 rounded focus:ring-blue-400 focus:ring-opacity-50"
                            checked={selectedInvestmentIds.includes(opt.id)}
                            onChange={() => handleInvestmentToggle(opt.id, opt.cost)}
                            disabled={isSubmitting || (!selectedInvestmentIds.includes(opt.id) && spentBudget + opt.cost > investUpToBudget)}
                        />
                        <span className="ml-3 text-sm font-medium flex-grow">{opt.name}</span>
                        <span
                            className={`text-sm font-semibold ${selectedInvestmentIds.includes(opt.id) ? 'text-blue-200' : 'text-yellow-300'}`}>
              ({formatCurrency(opt.cost)})
            </span>
                    </label>
                ))}
            </div>
        </>
    );

    const renderChoicePanel = () => (
        <>
            <h3 className="text-xl font-semibold text-white mb-3">{currentPhase?.label || "Make Your Choice"}</h3>
            <div className="space-y-3">
                {challengeOptions.map((opt) => (
                    <label
                        key={opt.id}
                        className={`flex items-start p-3 rounded-md transition-all cursor-pointer border-2
                        ${selectedChallengeOptionId === opt.id
                            ? 'bg-blue-600/80 border-blue-400 text-white'
                            : 'bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'
                        }`}
                    >
                        <input
                            type="radio"
                            name="challengeOption"
                            className="form-radio h-5 w-5 text-blue-500 mt-0.5 bg-gray-700 border-gray-500 focus:ring-blue-400 focus:ring-opacity-50"
                            checked={selectedChallengeOptionId === opt.id}
                            onChange={() => handleChallengeSelect(opt.id)}
                            disabled={isSubmitting}
                        />
                        <span className="ml-3 text-sm">
              <span className="font-semibold">{opt.id}. </span>{opt.text}
                            {opt.estimated_cost !== undefined && (
                                <span className="block text-xs opacity-80 mt-0.5">
                  Estimated Cost/Impact: {formatCurrency(opt.estimated_cost)}
                </span>
                            )}
            </span>
                    </label>
                ))}
            </div>
        </>
    );

    const renderDoubleDownPromptPanel = () => (
        <>
            <h3 className="text-xl font-semibold text-white mb-3">Double Down Opportunity!</h3>
            <p className="text-sm text-gray-300 mb-4">
                You can sacrifice one of your RD-3 investments to double the potential payoff (or risk!) of another RD-3
                investment.
                This is based on a dice roll.
            </p>
            <div className="space-y-3">
                <label
                    className={`flex items-center p-3 rounded-md transition-all cursor-pointer border-2 ${selectedChallengeOptionId === 'yes_dd' ? 'bg-green-600/80 border-green-400 text-white' : 'bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'}`}>
                    <input type="radio" name="doubleDownOption" value="yes_dd"
                           checked={selectedChallengeOptionId === 'yes_dd'}
                           onChange={(e) => setSelectedChallengeOptionId(e.target.value)}
                           className="form-radio h-5 w-5 text-green-500"/>
                    <span className="ml-3 text-sm font-medium">Yes, I want to Double Down!</span>
                </label>
                <label
                    className={`flex items-center p-3 rounded-md transition-all cursor-pointer border-2 ${selectedChallengeOptionId === 'no_dd' ? 'bg-red-600/80 border-red-400 text-white' : 'bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'}`}>
                    <input type="radio" name="doubleDownOption" value="no_dd"
                           checked={selectedChallengeOptionId === 'no_dd'}
                           onChange={(e) => setSelectedChallengeOptionId(e.target.value)}
                           className="form-radio h-5 w-5 text-red-500"/>
                    <span className="ml-3 text-sm font-medium">No, I'll stick with my current RD-3 investments.</span>
                </label>
            </div>
        </>
    );

    const renderDoubleDownSelectPanel = () => (
        <>
            <h3 className="text-xl font-semibold text-white mb-3">Select Your Double Down</h3>
            <div className="mb-4">
                <label htmlFor="sacrifice-select" className="block text-sm font-medium text-gray-300 mb-1">
                    1. Sacrifice one RD-3 Investment:
                </label>
                <select
                    id="sacrifice-select"
                    value={sacrificeInvestmentId || ''}
                    onChange={(e) => setSacrificeInvestmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
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
                <label htmlFor="double-down-select" className="block text-sm font-medium text-gray-300 mb-1">
                    2. Double Down on another RD-3 Investment:
                </label>
                <select
                    id="double-down-select"
                    value={doubleDownOnInvestmentId || ''}
                    onChange={(e) => setDoubleDownOnInvestmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                >
                    <option value="" disabled>Select investment to double down on</option>
                    {availableRd3Investments
                        .filter(opt => opt.id !== sacrificeInvestmentId) // Can't double down on the one you sacrifice
                        .map(opt => (
                            <option key={`dd-${opt.id}`} value={opt.id}>
                                {opt.name} ({formatCurrency(opt.cost)})
                            </option>
                        ))}
                </select>
            </div>
        </>
    );


    if (!isDecisionTime || !currentPhase) {
        return (
            <div
                className="p-6 bg-gray-900 text-gray-400 text-center rounded-b-xl min-h-[200px] flex items-center justify-center">
                <Hourglass size={24} className="mr-2 animate-pulse"/>
                Waiting for facilitator to start decision phase...
            </div>
        );
    }

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="p-4 md:p-6 bg-gray-900 text-white rounded-b-xl shadow-lg">
            {currentPhase.phase_type === 'invest' && renderInvestmentPanel()}
            {currentPhase.phase_type === 'choice' && renderChoicePanel()}
            {currentPhase.phase_type === 'double-down-prompt' && renderDoubleDownPromptPanel()}
            {currentPhase.phase_type === 'double-down-select' && renderDoubleDownSelectPanel()}

            {submitError && (
                <div className="mt-4 p-3 bg-red-500/30 text-red-300 border border-red-500/50 rounded-md text-sm">
                    <AlertTriangle size={16} className="inline mr-2"/> {submitError}
                </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                {timeRemainingSeconds !== undefined && (
                    <div className="text-sm text-yellow-400 font-mono">
                        Time remaining: {formatTime(timeRemainingSeconds)}
                    </div>
                )}
                <button
                    onClick={handleSubmitClick}
                    disabled={isSubmitting || (currentPhase.phase_type === 'invest' && selectedInvestmentIds.length === 0 && investUpToBudget > 0)} // Disable if no investments made unless budget is 0
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-md shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <CheckCircle size={20}/>
                    )}
                    Submit Decisions
                </button>
            </div>

            <Modal
                isOpen={showConfirmationModal}
                onClose={() => setShowConfirmationModal(false)}
                title="Confirm Submission"
            >
                <p className="text-sm text-gray-600 mb-4">Are you sure you want to submit these decisions? This action
                    cannot be undone for the current phase.</p>
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
            </Modal>
        </div>
    );
};

// Helper from KpiDisplay or a shared util
const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 2)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `$${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 0)}K`;
    }
    return `$${value.toFixed(0)}`;
};

export default DecisionPanel;