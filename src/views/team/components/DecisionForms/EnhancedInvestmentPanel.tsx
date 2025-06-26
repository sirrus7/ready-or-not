// src/views/team/components/DecisionForms/EnhancedInvestmentPanel.tsx
// Fixed version with checkboxes and proper grouping

import React, {useState, useEffect, useMemo} from 'react';
import {InvestmentOption} from '@shared/types';
import {ContinuationPricingEngine, InvestmentPricing} from '@core/game/ContinuationPricingEngine';
import {CheckCircle, Info, Ban} from 'lucide-react';
import ImmediatePurchaseModal from './ImmediatePurchaseModal';
import {InvestmentDisplayUtils} from "@shared/utils/InvestmentDisplayUtils.ts";

// Helper function for currency formatting
const formatCurrency = (amount: number): string => {
    if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
    return `${amount.toFixed(0)}`;
};

interface EnhancedInvestmentPanelProps {
    sessionId: string;
    teamId: string;
    currentRound: 1 | 2 | 3;
    investmentOptions: InvestmentOption[];
    selectedInvestmentIds: string[];
    spentBudget: number;
    investUpToBudget: number;
    onInvestmentToggle: (optionIndex: number, cost: number) => void;
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
                                                                             onInvestmentToggle,
                                                                             onImmediatePurchase,
                                                                             isSubmitting,
                                                                             immediatePurchases
                                                                         }) => {

    console.log('🔍 [EnhancedInvestmentPanel] Full component state:', {
        currentRound,
        selectedInvestmentIds,
        immediatePurchases,
        investmentOptions: investmentOptions.map((opt, i) => ({
            index: i,
            id: opt.id,
            name: opt.name.split('.')[0],
            cost: opt.cost
        }))
    });


    const [investmentPricing, setInvestmentPricing] = useState<InvestmentPricing[]>([]);
    const [isLoadingPricing, setIsLoadingPricing] = useState(false);
    const [showImmediateModal, setShowImmediateModal] = useState<number | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const remainingBudget = investUpToBudget - spentBudget;

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
    const {reinvestInvestments, newInvestments} = useMemo(() => {
        if (!investmentOptions.length) {
            return {reinvestInvestments: [], newInvestments: []};
        }

        const enhanced = investmentOptions.map((option, index) => {
            const pricing = investmentPricing.find(p => p.investmentId === option.id);
            const isSelected = selectedInvestmentIds.includes(option.id);
            const isImmediatePurchased = immediatePurchases.includes(option.id);
            const isImmediate = option.is_immediate_purchase || false;

            // ADD THIS DEBUG LOG:
            console.log('🔍 [Round3Debug] Creating enhanced investment:', {
                id: option.id,
                name: option.name.split('.')[0], // Just first part
                index,
                isSelected,
                isImmediatePurchased,
                group: pricing?.availability === 'continue' ? 'reinvest' : 'new'
            });

            return {
                ...option,
                index,
                pricing,
                isSelected,
                isImmediatePurchased,
                isImmediate,
                isDisabled: pricing?.availability === 'not_available' || isImmediatePurchased,
                effectivePrice: pricing?.finalPrice ?? option.cost,
                group: pricing?.availability === 'continue' ? 'reinvest' : 'new'
            } as EnhancedInvestment;
        }).filter(investment => investment.pricing?.availability !== 'not_available');

        return {
            reinvestInvestments: enhanced.filter(inv => inv.group === 'reinvest'),
            newInvestments: enhanced.filter(inv => inv.group === 'new')
        };
    }, [investmentOptions, investmentPricing, selectedInvestmentIds, immediatePurchases]);

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

    const getInvestmentCardClasses = (investment: EnhancedInvestment, isSelected: boolean) => {
        const baseClasses = "relative border-2 rounded-lg transition-all duration-200";

        if (investment.isDisabled) {
            return `${baseClasses} border-gray-600 bg-gray-800/50 opacity-60`;
        }

        if (isSelected || investment.isImmediatePurchased) {
            return investment.group === 'reinvest'
                ? `${baseClasses} border-green-400 bg-green-900/30 shadow-lg`
                : `${baseClasses} border-blue-400 bg-blue-900/30 shadow-lg`;
        }

        // Unaffordable
        const isUnaffordable = remainingBudget < investment.effectivePrice;
        if (isUnaffordable) {
            return `${baseClasses} border-gray-600 bg-gray-800/30 opacity-50`;
        }

        // Default state
        return investment.group === 'reinvest'
            ? `${baseClasses} border-green-500 bg-green-900/20 hover:bg-green-900/30`
            : `${baseClasses} border-gray-500 bg-gray-800/50 hover:bg-gray-700/50`;
    };

    const renderPricingInfo = (investment: EnhancedInvestment) => {
        const {pricing, cost} = investment;

        if (!pricing || currentRound === 1) {
            return (
                <div className="text-right">
                    <div className="text-lg font-bold text-white">
                        {formatCurrency(cost)}
                    </div>
                </div>
            );
        }

        if (pricing.availability === 'continue' && pricing.freshPrice) {
            // Show savings for continuation
            return (
                <div className="text-right">
                    <div className="text-sm text-gray-400 line-through">
                        {formatCurrency(pricing.freshPrice)}
                    </div>
                    <div className="text-lg font-bold text-green-400">
                        {formatCurrency(pricing.finalPrice)}
                    </div>
                    <div className="text-xs text-green-300">
                        Save {formatCurrency(pricing.freshPrice - pricing.finalPrice)}
                    </div>
                </div>
            );
        }

        return (
            <div className="text-right">
                <div className="text-lg font-bold text-white">
                    {formatCurrency(pricing.finalPrice)}
                </div>
            </div>
        );
    };

    const renderInvestmentCard = (investment: EnhancedInvestment) => {
        const isSelected = investment.isSelected || investment.isImmediatePurchased;
        // ADD THIS DEBUG LOG:
        console.log('🔍 [Round3Debug] Rendering card:', {
            id: investment.id,
            name: investment.name.split('.')[0],
            isSelected,
            isImmediatePurchased: investment.isImmediatePurchased,
            checkboxWillShow: isSelected // This is what checkbox checked= uses
        });

        const isUnaffordable = !isSelected && remainingBudget < investment.effectivePrice;
        const isInteractable = !investment.isDisabled && !isUnaffordable && !isSubmitting;

        return (
            <div
                key={investment.id}
                className={getInvestmentCardClasses(investment, isSelected)}
            >
                <label className={`flex items-start p-4 ${isInteractable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    {/* Checkbox */}
                    <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-blue-500 mt-1 bg-gray-700 border-gray-500 focus:ring-blue-400 focus:ring-offset-0 focus:ring-opacity-50 flex-shrink-0 rounded disabled:opacity-50"
                        checked={isSelected || investment.isImmediatePurchased}
                        disabled={!isInteractable}
                        onChange={() => {
                            if (!isInteractable) return;

                            const correctIndex = investmentOptions.findIndex(opt => opt.id === investment.id);

                            console.log('🔍 [EnhancedInvestmentPanel] ABOUT TO CALL onInvestmentToggle:', {
                                correctIndex,
                                effectivePrice: investment.effectivePrice
                            });

                            if (correctIndex === -1) {
                                console.error('[EnhancedInvestmentPanel] Could not find investment:', investment.id);
                                return;
                            }

                            if (investment.isImmediate && !investment.isImmediatePurchased) {
                                setShowImmediateModal(correctIndex);
                            } else {
                                // Add immediate logging right before the call
                                console.log('🔥 CALLING onInvestmentToggle RIGHT NOW with:', correctIndex, investment.effectivePrice);
                                onInvestmentToggle(correctIndex, investment.effectivePrice);
                                console.log('🔥 CALLED onInvestmentToggle - done');
                            }
                        }}
                    />

                    {/* Investment Content */}
                    <div className="ml-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`font-medium ${
                                investment.isImmediatePurchased
                                    ? 'text-green-100'
                                    : isUnaffordable
                                        ? 'text-gray-400'
                                        : 'text-white'
                            }`}>
                                {InvestmentDisplayUtils.getDisplayId(investment.id, true)}. {investment.name}
                            </span>
                        </div>

                        {investment.description && (
                            <p className="text-xs text-gray-300 leading-relaxed mb-2">
                                {investment.description}
                            </p>
                        )}

                        {investment.pricing?.reason && investment.pricing.availability === 'continue' && (
                            <p className="text-xs text-green-400 italic">
                                Continuing from previous round
                            </p>
                        )}

                        {investment.pricing?.availability === 'not_available' && (
                            <p className="text-xs text-gray-400 italic">
                                {investment.pricing.reason}
                            </p>
                        )}
                    </div>

                    {renderPricingInfo(investment)}
                </label>

                {/* Selection Indicator */}
                {isSelected && !investment.isDisabled && (
                    <div className="absolute top-2 right-2">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            investment.group === 'reinvest' ? 'bg-green-500' : 'bg-blue-500'
                        }`}>
                            <CheckCircle className="w-3 h-3 text-white"/>
                        </div>
                    </div>
                )}

                {/* Disabled Overlay */}
                {investment.isDisabled && investment.pricing?.availability === 'not_available' && (
                    <div className="absolute inset-0 bg-gray-900/30 rounded-lg flex items-center justify-center">
                        <Ban className="w-8 h-8 text-gray-500"/>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Budget Summary */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Budget Remaining:</span>
                    <span className={`text-xl font-bold ${
                        remainingBudget < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                        {formatCurrency(remainingBudget)}
                    </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                    Total Budget: {formatCurrency(investUpToBudget)} | Spent: {formatCurrency(spentBudget)}
                </div>
            </div>

            {/* Continuation Pricing Legend for rounds 2+ */}
            {currentRound > 1 && (
                <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                    <div className="flex items-center mb-2">
                        <Info className="w-4 h-4 text-blue-400 mr-2"/>
                        <span className="text-sm font-medium text-blue-300">Continuation Pricing</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                            <span className="text-gray-300">Reinvest = Reduced Price</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
                            <span className="text-gray-300">New = Full Price</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Reinvest Section */}
            {reinvestInvestments.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <h3 className="text-lg font-semibold text-green-400">🔄 Reinvest (Reduced Prices)</h3>
                    </div>
                    <div className="space-y-3">
                        {reinvestInvestments.map(investment => renderInvestmentCard(investment))}
                    </div>
                </div>
            )}

            {/* New Investments Section */}
            {newInvestments.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-500 rounded"></div>
                        <h3 className="text-lg font-semibold text-white">✨ New Investments</h3>
                    </div>
                    <div className="space-y-3">
                        {newInvestments.map(investment => renderInvestmentCard(investment))}
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoadingPricing && currentRound > 1 && (
                <div className="text-center py-8">
                    <div className="text-gray-400">Loading pricing data...</div>
                </div>
            )}

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

export default EnhancedInvestmentPanel;
