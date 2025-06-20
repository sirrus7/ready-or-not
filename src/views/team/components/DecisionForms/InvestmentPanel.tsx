// src/views/team/components/DecisionForms/InvestmentPanel.tsx
// Updated to use standalone ImmediatePurchaseModal component

import React, {useState} from 'react';
import {Zap, CheckCircle} from 'lucide-react';
import {InvestmentOption} from '@shared/types';
import ImmediatePurchaseModal from './ImmediatePurchaseModal';

interface InvestmentPanelProps {
    investmentOptions: InvestmentOption[];
    selectedInvestmentIds: string[];
    spentBudget: number;
    investUpToBudget: number;
    onInvestmentToggle: (optionIndex: number) => void;
    onImmediatePurchase: (optionIndex: number) => Promise<void>;
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
            await onImmediatePurchase(showImmediateModal);
            setShowImmediateModal(null);
        } catch (error) {
            console.error('Immediate purchase failed:', error);
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Budget Display */}
            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                <div className="flex justify-between items-center">
                    <span className="text-gray-300">Budget Remaining:</span>
                    <span className={`text-lg font-bold ${
                        (investUpToBudget - spentBudget) < 0 ? 'text-red-400' : 'text-green-400'
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
                            className={`relative border-2 rounded-lg p-4 transition-all duration-200 ${
                                isDisabled
                                    ? 'border-gray-600 bg-gray-800/50 opacity-60 cursor-not-allowed'
                                    : isSelected
                                        ? 'border-blue-400 bg-blue-900/30 shadow-lg cursor-pointer'
                                        : 'border-gray-500 bg-gray-800/50 hover:bg-gray-700/50 cursor-pointer'
                            }`}
                            onClick={() => {
                                if (isDisabled || isSubmitting) return;

                                if (isImmediate && !isImmediatePurchased) {
                                    setShowImmediateModal(optionIndex);
                                } else {
                                    onInvestmentToggle(optionIndex);
                                }
                            }}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
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
                                        <p className="text-xs text-gray-300 leading-relaxed">
                                            {opt.description}
                                        </p>
                                    )}
                                </div>
                                <span className={`text-lg font-bold flex-shrink-0 ml-4 ${
                                    isImmediatePurchased
                                        ? 'text-green-400'
                                        : isSelected
                                            ? 'text-blue-200'
                                            : 'text-yellow-300'
                                }`}>
                                    {formatCurrency(opt.cost)}
                                </span>
                            </div>

                            {/* Selection Indicator */}
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

            {/* Immediate Purchase Modal - Now using standalone component */}
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
