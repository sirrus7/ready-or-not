// MOBILE-FIRST APPROACH: Inline confirmation instead of modals
// This approach works for both InvestmentPanel.tsx and EnhancedInvestmentPanel.tsx

// ================================
// 1. REGULAR INVESTMENT PANEL (Round 1)
// ================================

// src/views/team/components/DecisionForms/InvestmentPanel.tsx
import React, {useState} from 'react';
import {InvestmentOption} from '@shared/types';
import {CheckCircle, Zap, AlertTriangle} from 'lucide-react';
import {InvestmentDisplayUtils} from "@shared/utils/InvestmentDisplayUtils.ts";

interface InvestmentPanelProps {
    investmentOptions: InvestmentOption[];
    selectedInvestmentIds: string[];
    spentBudget: number;
    investUpToBudget: number;
    onInvestmentToggleById: (investmentId: string, cost: number) => void;
    onImmediatePurchase: (optionIndex: number, cost: number) => Promise<void>;
    isSubmitting: boolean;
    immediatePurchases: string[];
}

const InvestmentPanel: React.FC<InvestmentPanelProps> = ({
                                                             investmentOptions,
                                                             selectedInvestmentIds,
                                                             spentBudget,
                                                             investUpToBudget,
                                                             onInvestmentToggleById,
                                                             onImmediatePurchase,
                                                             isSubmitting,
                                                             immediatePurchases
                                                         }) => {
    const [expandedImmediate, setExpandedImmediate] = useState<number | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const remainingBudget = (investUpToBudget ?? 0) - (spentBudget ?? 0);

    const handleImmediatePurchaseConfirm = async (optionIndex: number, cost: number) => {
        setIsPurchasing(true);
        try {
            await onImmediatePurchase(optionIndex, cost);
            setExpandedImmediate(null);
        } catch (error) {
            console.error('Immediate purchase failed:', error);
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="space-y-4">
            {investmentOptions.map((opt, optionIndex) => {
                const isSelected = selectedInvestmentIds.includes(opt.id);
                const isImmediatePurchased = immediatePurchases.includes(opt.id);
                const isImmediate = opt.is_immediate_purchase || false;
                const isUnaffordable = (opt.cost ?? 0) > remainingBudget && !isSelected;
                const isInteractable = !isUnaffordable && !isSubmitting && !isImmediatePurchased;
                const isExpanded = expandedImmediate === optionIndex;

                return (
                    <div
                        key={opt.id}
                        className={`rounded-lg border-2 transition-all duration-300 ${
                            isImmediatePurchased
                                ? 'border-green-400 bg-green-900/30'
                                : isUnaffordable
                                    ? 'border-gray-600 bg-gray-800/30 opacity-50'
                                    : isSelected || isExpanded
                                        ? 'border-game-orange-400 bg-blue-900/30 shadow-lg'
                                        : 'border-gray-500 bg-gray-800/50 hover:bg-gray-700/50'
                        }`}
                    >
                        {/* Main Investment Content */}
                        <label className={`flex items-start p-4 ${
                            isInteractable ? 'cursor-pointer' : 'cursor-not-allowed'
                        }`}>
                            {/* Checkbox */}
                            <input
                                type="checkbox"
                                className="form-checkbox h-5 w-5 text-blue-500 mt-1 bg-gray-700 border-gray-500 focus:ring-game-orange-400 focus:ring-offset-0 focus:ring-opacity-50 flex-shrink-0 rounded disabled:opacity-50"
                                checked={isSelected || isImmediatePurchased || (isImmediate && isExpanded)}
                                disabled={!isInteractable}
                                onChange={() => {
                                    if (!isInteractable) return;

                                    if (isImmediate && !isImmediatePurchased) {
                                        setExpandedImmediate(isExpanded ? null : optionIndex);
                                    } else {
                                        onInvestmentToggleById(opt.id, opt.cost ?? 0);
                                    }
                                }}
                            />

                            {/* Investment Content */}
                            <div className="ml-4 flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className={`font-medium ${
                                        isImmediatePurchased
                                            ? 'text-green-100'
                                            : isUnaffordable
                                                ? 'text-gray-400'
                                                : 'text-white'
                                    }`}>
                                        {InvestmentDisplayUtils.getDisplayId(opt.id, true)}. {opt.name}
                                    </span>

                                    {/* Status badges */}
                                    {isImmediatePurchased && (
                                        <span className="px-2 py-1 text-xs bg-green-600 text-white rounded-full">
                                            Purchased
                                        </span>
                                    )}
                                    {isImmediate && !isImmediatePurchased && (
                                        <span className="px-2 py-1 text-xs bg-yellow-600 text-white rounded-full">
                                            Immediate
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                {opt.description && (
                                    <p className={`text-sm mb-3 leading-relaxed ${
                                        isUnaffordable ? 'text-gray-500' : 'text-gray-300'
                                    }`}>
                                        {opt.description}
                                    </p>
                                )}

                                {/* Price and selection indicator */}
                                <div className="flex items-center justify-between">
                                    <span className={`text-lg font-bold ${
                                        isImmediatePurchased
                                            ? 'text-green-400'
                                            : isUnaffordable
                                                ? 'text-gray-500'
                                                : 'text-yellow-400'
                                    }`}>
                                        ${((opt.cost ?? 0) / 1000).toFixed(0)}K
                                    </span>

                                    {isSelected && !isExpanded && (
                                        <div className="flex items-center gap-1">
                                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                                                isImmediatePurchased ? 'bg-green-500' : 'bg-game-orange-500'
                                            }`}>
                                                <CheckCircle className="w-3 h-3 text-white"/>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </label>

                        {/* Inline Immediate Purchase Confirmation (Mobile-Friendly) */}
                        {isExpanded && isImmediate && !isImmediatePurchased && (
                            <div className="border-t border-gray-600 bg-gray-800/70 p-4 space-y-4">
                                {/* Confirmation Header */}
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap className="w-5 h-5 text-yellow-400"/>
                                    <h4 className="text-lg font-semibold text-white">Confirm Immediate Purchase</h4>
                                </div>

                                {/* Price Display */}
                                <div className="text-center py-2">
                                    <div className="text-2xl font-bold text-yellow-400">
                                        ${((opt.cost ?? 0) / 1000).toFixed(0)}K
                                    </div>
                                </div>

                                {/* Warning */}
                                <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3">
                                    <div className="flex items-start space-x-3">
                                        <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0"/>
                                        <div>
                                            <h5 className="font-medium text-yellow-300 mb-1">Important:</h5>
                                            <ul className="text-yellow-200 text-sm space-y-1">
                                                <li>• This purchase will be made immediately</li>
                                                <li>• Cannot be undone once confirmed</li>
                                                <li>• Report will be delivered by your host</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons - Mobile Optimized */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => setExpandedImmediate(null)}
                                        disabled={isPurchasing}
                                        className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 text-center"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleImmediatePurchaseConfirm(optionIndex, opt.cost ?? 0)}
                                        disabled={isPurchasing}
                                        className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                                    >
                                        {isPurchasing ? (
                                            <>
                                                <div
                                                    className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                <span>Purchasing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-4 h-4"/>
                                                <span>Confirm Purchase</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default InvestmentPanel;
