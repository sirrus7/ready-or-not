// src/views/team/components/DecisionForms/InvestmentPanel.tsx
// FIXED: Added proper checkboxes like ChoicePanel for visual selection clarity

import React, {useState} from 'react';
import {InvestmentOption} from '@shared/types';
import {CheckCircle, Zap} from 'lucide-react';
import ImmediatePurchaseModal from './ImmediatePurchaseModal';

interface InvestmentPanelProps {
    investmentOptions: InvestmentOption[];
    selectedInvestmentIds: string[];
    spentBudget: number;
    investUpToBudget: number;
    onInvestmentToggle: (optionIndex: number, cost: number) => void;
    onImmediatePurchase: (optionIndex: number, cost: number) => Promise<void>;
    isSubmitting: boolean;
    immediatePurchases: string[];
}

const formatCurrency = (amount: number): string => {
    return `$${(amount / 1000).toFixed(0)}K`;
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

    const handleImmediatePurchaseConfirm = async () => {
        if (showImmediateModal === null) return;

        setIsPurchasing(true);
        try {
            const option = investmentOptions[showImmediateModal];
            await onImmediatePurchase(showImmediateModal, option.cost);
            setShowImmediateModal(null);
        } catch (error) {
            console.error('[InvestmentPanel] Immediate purchase failed:', error);
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Budget Display */}
            <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-300">Remaining Budget:</span>
                    <span className={`text-lg font-bold ${
                        spentBudget > investUpToBudget ? 'text-red-400' : 'text-green-400'
                    }`}>
                        {formatCurrency(investUpToBudget - spentBudget)}
                    </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                    Total Budget: {formatCurrency(investUpToBudget)} | Spent: {formatCurrency(spentBudget)}
                </div>
            </div>

            {/* Investment Options */}
            <div className="space-y-3">
                {investmentOptions.map((opt, optionIndex) => {
                    const isSelected = selectedInvestmentIds.includes(opt.id);
                    const isImmediatePurchased = immediatePurchases.includes(opt.id);
                    const isImmediate = opt.is_immediate_purchase || false;
                    const isDisabled = isImmediatePurchased;

                    return (
                        <div
                            key={opt.id}
                            className={`relative border-2 rounded-lg transition-all duration-200 ${
                                isDisabled
                                    ? 'border-gray-600 bg-gray-800/50 opacity-60'
                                    : isSelected
                                        ? 'border-blue-400 bg-blue-900/30 shadow-lg'
                                        : 'border-gray-500 bg-gray-800/50 hover:bg-gray-700/50'
                            }`}
                        >
                            {/* FIXED: Added proper checkbox/selection interface */}
                            <label className={`flex items-start p-4 cursor-pointer ${
                                isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}>
                                {/* FIXED: Added checkbox like ChoicePanel */}
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-5 w-5 text-blue-500 mt-1 bg-gray-700 border-gray-500 focus:ring-blue-400 focus:ring-offset-0 focus:ring-opacity-50 flex-shrink-0 rounded"
                                    checked={isSelected}
                                    disabled={isDisabled || isSubmitting}
                                    onChange={() => {
                                        if (isDisabled || isSubmitting) return;

                                        if (isImmediate && !isImmediatePurchased) {
                                            setShowImmediateModal(optionIndex);
                                        } else {
                                            onInvestmentToggle(optionIndex, opt.cost);
                                        }
                                    }}
                                />

                                {/* Investment Content */}
                                <div className="ml-4 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="font-medium text-white">
                                            {opt.id}. {opt.name}
                                        </span>
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
                                        <p className="text-xs text-gray-300 leading-relaxed mb-2">
                                            {opt.description}
                                        </p>
                                    )}

                                    {/* Cost Display */}
                                    <div className="flex justify-between items-center">
                                        <span className={`text-lg font-bold ${
                                            isImmediatePurchased
                                                ? 'text-green-400'
                                                : isSelected
                                                    ? 'text-blue-200'
                                                    : 'text-yellow-300'
                                        }`}>
                                            {formatCurrency(opt.cost)}
                                        </span>
                                    </div>
                                </div>
                            </label>

                            {/* Selection Indicator - Keep for additional visual feedback */}
                            {isSelected && !isDisabled && (
                                <div className="absolute top-2 right-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-3 h-3 text-white"/>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Immediate Purchase Modal */}
            {showImmediateModal !== null && (
                <ImmediatePurchaseModal
                    option={investmentOptions[showImmediateModal]}
                    isOpen={true}
                    onConfirm={handleImmediatePurchaseConfirm}
                    onCancel={() => setShowImmediateModal(null)}
                    isPurchasing={isPurchasing}
                />
            )}
        </div>
    );
};

export default InvestmentPanel;
