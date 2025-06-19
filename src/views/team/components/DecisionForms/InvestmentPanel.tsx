// src/views/team/components/DecisionForms/InvestmentPanel.tsx
// UPDATED: Data-driven immediate purchase detection using option properties

import React, {useState} from 'react';
import {InvestmentOption} from '@shared/types';
import {AlertTriangle, CheckCircle, Clock, Zap} from 'lucide-react';

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
    selectedInvestmentIds: string[];  // Contains letters ['A', 'B', 'C']
    spentBudget: number;
    investUpToBudget: number;
    onInvestmentToggle: (optionIndex: number, cost: number) => void;
    onImmediatePurchase: (optionIndex: number, cost: number) => Promise<void>;
    isSubmitting: boolean;
    immediatePurchases: string[];  // Contains letters ['A', 'B']
}

// Immediate Purchase Confirmation Modal
const ImmediatePurchaseModal: React.FC<{
    option: InvestmentOption;
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isPurchasing: boolean;
}> = ({option, isOpen, onConfirm, onCancel, isPurchasing}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-yellow-500">
                <div className="flex items-center mb-4">
                    <Zap className="text-yellow-400 mr-3" size={24}/>
                    <h3 className="text-xl font-bold text-yellow-400">Immediate Purchase</h3>
                </div>

                <div className="mb-4">
                    <h4 className="font-semibold text-white mb-2">{option.name}</h4>
                    <p className="text-gray-300 text-sm mb-3">{option.description}</p>

                    <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4">
                        <div className="flex items-start">
                            <AlertTriangle className="text-yellow-400 mr-2 mt-0.5" size={16}/>
                            <div className="text-sm">
                                <p className="text-yellow-200 font-medium mb-1">This purchase happens immediately!</p>
                                <p className="text-yellow-300">
                                    {/* Use custom message from option, or default */}
                                    {option.immediate_purchase_message ||
                                        `You'll receive a ${option.report_name || 'Report'} from your host.`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-gray-400">Cost:</span>
                        <span className="text-yellow-300 font-semibold">{formatCurrency(option.cost)}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isPurchasing}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isPurchasing}
                        className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isPurchasing ? 'Purchasing...' : 'Purchase Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Status display for immediate purchases
const ImmediatePurchaseStatus: React.FC<{
    purchasedOptions: InvestmentOption[];
}> = ({purchasedOptions}) => {
    if (purchasedOptions.length === 0) return null;

    return (
        <div className="bg-green-900/30 border border-green-600 rounded-lg p-3 mb-4">
            <div className="flex items-center mb-2">
                <CheckCircle className="text-green-400 mr-2" size={16}/>
                <h4 className="text-green-300 font-medium">Immediate Purchases Completed</h4>
            </div>

            {purchasedOptions.map(option => (
                <div key={option.id} className="text-sm text-green-200 mb-1">
                    • {option.name} - {formatCurrency(option.cost)}
                </div>
            ))}

            <div className="mt-3 p-2 bg-blue-900/30 border border-blue-600 rounded">
                <div className="flex items-center">
                    <Clock className="text-blue-400 mr-2" size={16}/>
                    <p className="text-blue-300 text-sm">
                        <strong>Next Step:</strong> Go to your host to collect your report(s)
                    </p>
                </div>
            </div>
        </div>
    );
};

const InvestmentPanel: React.FC<InvestmentPanelProps> = ({
                                                             investmentOptions,
                                                             selectedInvestmentIds,
                                                             spentBudget,
                                                             investUpToBudget,
                                                             onInvestmentToggle,
                                                             onImmediatePurchase,
                                                             isSubmitting,
                                                             immediatePurchases
                                                         }) => {
    const [showImmediateModal, setShowImmediateModal] = useState<number | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    // Convert index to letter (0=A, 1=B, 2=C, etc.)
    const getLetterForIndex = (index: number): string => {
        return String.fromCharCode(65 + index); // 65 is ASCII for 'A'
    };

    const handleInvestmentClick = (optionIndex: number, cost: number) => {
        const option = investmentOptions[optionIndex];
        if (!option) return;

        // DATA-DRIVEN: Check if option is marked as immediate purchase
        if (option.is_immediate_purchase) {
            setShowImmediateModal(optionIndex);
        } else {
            onInvestmentToggle(optionIndex, cost);
        }
    };

    const handleImmediatePurchaseConfirm = async () => {
        if (showImmediateModal === null) return;

        const option = investmentOptions[showImmediateModal];
        if (!option) return;

        setIsPurchasing(true);
        try {
            await onImmediatePurchase(showImmediateModal, option.cost);
            setShowImmediateModal(null);
        } catch (error) {
            console.error('Immediate purchase failed:', error);
            // Error handling would be done in the parent component
        } finally {
            setIsPurchasing(false);
        }
    };

    // Get immediate purchase options by checking letters against actual options
    const immediatePurchaseOptions = investmentOptions.filter((opt, index) => {
        const letter = getLetterForIndex(index);
        return immediatePurchases.includes(letter);
    });

    return (
        <div className="space-y-3">
            <ImmediatePurchaseStatus purchasedOptions={immediatePurchaseOptions}/>

            {investmentOptions.map((opt, index) => {
                const letter = getLetterForIndex(index);
                const isSelected = selectedInvestmentIds.includes(letter);
                const isImmediatePurchased = immediatePurchases.includes(letter);
                const isImmediate = opt.is_immediate_purchase || false; // DATA-DRIVEN
                const canAfford = !isSelected && spentBudget + opt.cost <= investUpToBudget;
                const isDisabled = isSubmitting || (!isSelected && !canAfford) || isImmediatePurchased;

                return (
                    <div
                        key={opt.id}
                        className={`p-4 rounded-lg transition-all border-2 ${
                            isImmediatePurchased
                                ? 'bg-green-800/50 border-green-400 opacity-75'
                                : isSelected
                                    ? 'bg-blue-600/80 border-blue-400 text-white shadow-md'
                                    : 'bg-gray-600/70 border-gray-500 hover:bg-gray-500/70'
                        } ${isDisabled && !isImmediatePurchased ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={() => !isDisabled && handleInvestmentClick(index, opt.cost)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                {isImmediatePurchased ? (
                                    <CheckCircle className="h-5 w-5 text-green-400 mr-4"/>
                                ) : (
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-5 w-5 text-blue-500 bg-gray-700 border-gray-500 rounded focus:ring-blue-400 focus:ring-offset-0 focus:ring-opacity-50 disabled:opacity-50 flex-shrink-0"
                                        checked={isSelected}
                                        onChange={() => handleInvestmentClick(index, opt.cost)}
                                        disabled={isDisabled}
                                    />
                                )}
                                <div className="ml-4 flex-grow min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium">{letter}. {opt.name}</span>
                                        {isImmediate && !isImmediatePurchased && (
                                            <span
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-600">
                                                <Zap className="mr-1" size={12}/>
                                                Immediate
                                            </span>
                                        )}
                                        {isImmediatePurchased && (
                                            <span
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-600">
                                                <CheckCircle className="mr-1" size={12}/>
                                                Purchased
                                            </span>
                                        )}
                                    </div>
                                    {opt.description && (
                                        <p className="text-xs text-gray-300 leading-relaxed">
                                            {opt.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className={`text-sm font-semibold flex-shrink-0 ml-4 ${
                                isImmediatePurchased ?
                                    'text-green-400' :
                                    isSelected ? 'text-blue-200' : 'text-yellow-300'
                            }`}>
                                {formatCurrency(opt.cost)}
                            </span>
                        </div>
                    </div>
                );
            })}

            {/* Immediate Purchase Modal */}
            <ImmediatePurchaseModal
                option={investmentOptions.find((opt, idx) => idx === showImmediateModal)!}
                isOpen={showImmediateModal !== null}
                onConfirm={handleImmediatePurchaseConfirm}
                onCancel={() => setShowImmediateModal(null)}
                isPurchasing={isPurchasing}
            />
        </div>
    );
};

export default InvestmentPanel;
