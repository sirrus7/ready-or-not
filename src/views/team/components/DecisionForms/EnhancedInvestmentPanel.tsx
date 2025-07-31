// src/views/team/components/DecisionForms/EnhancedInvestmentPanel.tsx
import React, {useState, useEffect, useMemo} from 'react';
import {InvestmentOption} from '@shared/types';
import {ContinuationPricingEngine, InvestmentPricing} from '@core/game/ContinuationPricingEngine';
import {CheckCircle, Info, Ban, Zap, AlertTriangle} from 'lucide-react';
import {InvestmentDisplayUtils} from "@shared/utils/InvestmentDisplayUtils.ts";
import {formatCurrency} from '@shared/utils/formatUtils';

interface EnhancedInvestmentPanelProps {
    sessionId: string;
    teamId: string;
    currentRound: 1 | 2 | 3;
    investmentOptions: InvestmentOption[];
    selectedInvestmentIds: string[];
    spentBudget: number;
    investUpToBudget: number;
    onInvestmentToggleById: (investmentId: string, cost: number) => void;
    onImmediatePurchase: (optionIndex: number) => Promise<void>;
    isSubmitting: boolean;
    immediatePurchases: string[];
}

interface EnhancedInvestment extends InvestmentOption {
    index: number;
    pricing?: InvestmentPricing;
    isSelected: boolean;
    isImmediatePurchased: boolean;
    isImmediate: boolean;
    isDisabled: boolean;
    effectivePrice: number;
    group: 'reinvest' | 'new';
}

const EnhancedInvestmentPanel: React.FC<EnhancedInvestmentPanelProps> = ({
                                                                             sessionId,
                                                                             teamId,
                                                                             currentRound,
                                                                             investmentOptions,
                                                                             selectedInvestmentIds,
                                                                             spentBudget,
                                                                             investUpToBudget,
                                                                             onInvestmentToggleById,
                                                                             onImmediatePurchase,
                                                                             isSubmitting,
                                                                             immediatePurchases
                                                                         }) => {
    const [investmentPricing, setInvestmentPricing] = useState<InvestmentPricing[]>([]);
    const [isLoadingPricing, setIsLoadingPricing] = useState(false);
    const [expandedImmediate, setExpandedImmediate] = useState<number | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const remainingBudget = (investUpToBudget ?? 0) - (spentBudget ?? 0);

    // Load continuation pricing data for rounds 2+
    useEffect(() => {
        if (currentRound === 1) return;

        const loadPricingData = async () => {
            setIsLoadingPricing(true);
            try {
                const pricingResult = await ContinuationPricingEngine.calculateContinuationPricing(
                    sessionId,
                    teamId,
                    currentRound as 2 | 3
                );
                setInvestmentPricing(pricingResult.investmentPricing);
            } catch (error) {
                console.error('[EnhancedInvestmentPanel] Error loading pricing:', error);
                setInvestmentPricing([]);
            } finally {
                setIsLoadingPricing(false);
            }
        };

        loadPricingData();
    }, [sessionId, teamId, currentRound]);

    // Enhanced investment data with grouping
    const {allInvestments} = useMemo(() => {
        if (!investmentOptions.length) {
            return {reinvestInvestments: [], newInvestments: []};
        }

        const enhanced = investmentOptions.map((option, index) => {
            const pricing = investmentPricing.find(p => p.investmentId === option.id);
            const isSelected = selectedInvestmentIds.includes(option.id);
            const isImmediatePurchased = immediatePurchases.includes(option.id);
            const isImmediate = option.is_immediate_purchase || false;

            const baseCost = option.cost ?? 0;
            const effectivePrice = pricing?.finalPrice ?? baseCost;

            return {
                ...option,
                index,
                pricing,
                isSelected,
                isImmediatePurchased,
                isImmediate,
                isDisabled: pricing?.availability === 'not_available' || isImmediatePurchased,
                effectivePrice,
                group: pricing?.availability === 'continue' ? 'reinvest' : 'new'
            } as EnhancedInvestment;
        });

        const allInvestments = enhanced
            .filter(inv => inv.pricing?.availability !== 'not_available')
            .sort((a, b) => {
                const aNum = parseInt(InvestmentDisplayUtils.letterToNumber(a.id));
                const bNum = parseInt(InvestmentDisplayUtils.letterToNumber(b.id));
                return aNum - bNum;
            });

        return { allInvestments };
    }, [investmentOptions, investmentPricing, selectedInvestmentIds, immediatePurchases]);

    // Handle immediate purchase confirmation
    const handleImmediatePurchaseConfirm = async (correctIndex: number) => {
        setIsPurchasing(true);
        try {
            await onImmediatePurchase(correctIndex);
            setExpandedImmediate(null);
        } catch (error) {
            console.error('Immediate purchase failed:', error);
        } finally {
            setIsPurchasing(false);
        }
    };

    // Render investment card with inline confirmation
    const renderInvestmentCard = (investment: EnhancedInvestment) => {
        const {
            pricing,
            isSelected,
            isImmediatePurchased,
            isImmediate,
            isDisabled,
            effectivePrice,
            group
        } = investment;

        const isUnaffordable = (effectivePrice ?? 0) > remainingBudget && !isSelected;
        const isInteractable = !isDisabled && !isUnaffordable && !isSubmitting;

        // CRITICAL: Use correct index from original array for expansion state
        const correctIndex = investmentOptions.findIndex(opt => opt.id === investment.id);
        const isExpanded = expandedImmediate === correctIndex;

        return (
            <div
                key={investment.id}
                className={`rounded-lg border-2 transition-all duration-300 ${
                    isDisabled
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
                                // For immediate purchases, we still need the correct index
                                const correctIndex = investmentOptions.findIndex(opt => opt.id === investment.id);
                                setExpandedImmediate(correctIndex);
                            } else {
                                // USE ID-BASED APPROACH - eliminates index confusion completely
                                onInvestmentToggleById(investment.id, effectivePrice ?? 0);
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
                                {InvestmentDisplayUtils.getDisplayId(investment.id, true)}. {investment.name}
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
                            {pricing && group === 'reinvest' && (
                                <span className="px-2 py-1 text-xs bg-game-orange-600 text-white rounded-full">
                                    Reduced Price
                                </span>
                            )}
                            {pricing && group === 'new' && (
                                <span className="px-2 py-1 text-xs bg-gray-600 text-white rounded-full">
                                    New
                                </span>
                            )}
                        </div>

                        {/* Description */}
                        {investment.description && (
                            <p className={`text-sm mb-3 leading-relaxed ${
                                isUnaffordable ? 'text-gray-500' : 'text-gray-300'
                            }`}>
                                {investment.description}
                            </p>
                        )}

                        {/* Pricing information */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Price */}
                                <span className={`text-lg font-bold ${
                                    isImmediatePurchased
                                        ? 'text-green-400'
                                        : isUnaffordable
                                            ? 'text-gray-500'
                                            : pricing && group === 'reinvest'
                                                ? 'text-green-400'
                                                : 'text-yellow-400'
                                }`}>
                                    {formatCurrency(effectivePrice)}
                                </span>

                                {/* Original price if different */}
                                {pricing && pricing.freshPrice !== effectivePrice && pricing.freshPrice != null && (
                                    <span className="text-sm text-gray-400 line-through">
                                        {formatCurrency(pricing.freshPrice)}
                                    </span>
                                )}

                                {/* Availability status */}
                                {pricing && (
                                    <div className="flex items-center gap-1">
                                        {pricing.availability === 'continue' && (
                                            <Info className="w-4 h-4 text-blue-400"/>
                                        )}
                                        {pricing.availability === 'not_available' && (
                                            <Ban className="w-4 h-4 text-red-400"/>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selection indicator */}
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
                                {formatCurrency(effectivePrice)}
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
                                onClick={() => handleImmediatePurchaseConfirm(correctIndex)}
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
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                {(allInvestments || []).map(investment => renderInvestmentCard(investment))}
            </div>

            {/* Loading State */}
            {isLoadingPricing && currentRound > 1 && (
                <div className="text-center py-8">
                    <div className="text-gray-400">Loading pricing data...</div>
                </div>
            )}
        </div>
    );
};

export default EnhancedInvestmentPanel;
