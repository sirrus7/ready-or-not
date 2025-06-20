// src/views/team/components/DecisionForms/EnhancedInvestmentPanel.tsx
// Enhanced Investment Panel with continuation pricing integration

import React, {useState, useEffect, useMemo} from 'react';
import {Zap, CheckCircle, Ban, ArrowRight, Info} from 'lucide-react';
import {InvestmentOption} from '@shared/types';
import {ContinuationPricingEngine, InvestmentPricing} from '@core/game/ContinuationPricingEngine';
import ImmediatePurchaseModal from './ImmediatePurchaseModal';

interface EnhancedInvestmentPanelProps {
    sessionId: string;
    teamId: string;
    currentRound: 1 | 2 | 3;
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
    const [showImmediateModal, setShowImmediateModal] = useState<number | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [investmentPricing, setInvestmentPricing] = useState<InvestmentPricing[]>([]);
    const [isLoadingPricing, setIsLoadingPricing] = useState(false);

    // Load continuation pricing data
    useEffect(() => {
        const loadPricingData = async () => {
            if (currentRound === 1) {
                // Round 1 doesn't have continuation pricing
                setInvestmentPricing([]);
                return;
            }

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

    // Enhanced investment data with pricing information
    const enhancedInvestments = useMemo(() => {
        return investmentOptions.map((option, index) => {
            const pricing = investmentPricing.find(p => p.investmentId === option.id);
            const isSelected = selectedInvestmentIds.includes(option.id);
            const isImmediatePurchased = immediatePurchases.includes(option.id);
            const isImmediate = option.is_immediate_purchase || false;

            return {
                ...option,
                index,
                pricing,
                isSelected,
                isImmediatePurchased,
                isImmediate,
                isDisabled: pricing?.availability === 'not_available' || isImmediatePurchased,
                effectivePrice: pricing?.finalPrice ?? option.cost
            };
        });
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

    const getInvestmentCardClasses = (investment: typeof enhancedInvestments[0]) => {
        const baseClasses = "relative border-2 rounded-lg p-4 transition-all duration-200 cursor-pointer";

        if (investment.isDisabled) {
            return `${baseClasses} border-gray-600 bg-gray-800/50 opacity-60 cursor-not-allowed`;
        }

        if (investment.isSelected) {
            return `${baseClasses} border-blue-400 bg-blue-900/30 shadow-lg`;
        }

        // Continuation pricing highlighting
        if (investment.pricing?.availability === 'continue') {
            return `${baseClasses} border-green-400 bg-green-900/20 hover:bg-green-900/30 shadow-md`;
        }

        // Fresh investment
        return `${baseClasses} border-gray-500 bg-gray-800/50 hover:bg-gray-700/50`;
    };

    const renderPricingInfo = (investment: typeof enhancedInvestments[0]) => {
        const {pricing, cost} = investment;

        if (!pricing || currentRound === 1) {
            // Round 1 or no pricing data - show standard price
            return (
                <div className="text-right">
                    <div className="text-lg font-bold text-yellow-300">
                        {formatCurrency(cost)}
                    </div>
                </div>
            );
        }

        switch (pricing.availability) {
            case 'not_available':
                return (
                    <div className="text-right">
                        <div className="text-lg font-bold text-gray-400">N/A</div>
                        <div className="text-xs text-gray-500 mt-1">
                            {pricing.reason}
                        </div>
                    </div>
                );

            case 'continue':
                return (
                    <div className="text-right">
                        <div className="text-lg font-bold text-green-300">
                            {formatCurrency(pricing.finalPrice)}
                        </div>
                        <div className="text-xs text-green-400 mt-1 flex items-center justify-end">
                            <ArrowRight className="w-3 h-3 mr-1"/>
                            CONTINUE
                        </div>
                        {pricing.freshPrice && (
                            <div className="text-xs text-gray-400 line-through">
                                Fresh: {formatCurrency(pricing.freshPrice)}
                            </div>
                        )}
                    </div>
                );

            case 'fresh':
                return (
                    <div className="text-right">
                        <div className="text-lg font-bold text-yellow-300">
                            {formatCurrency(pricing.finalPrice)}
                        </div>
                        <div className="text-xs text-yellow-400 mt-1">
                            FRESH
                        </div>
                        {pricing.continuationPrice && (
                            <div className="text-xs text-gray-400">
                                Continue: {formatCurrency(pricing.continuationPrice)}
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <div className="text-right">
                        <div className="text-lg font-bold text-yellow-300">
                            {formatCurrency(cost)}
                        </div>
                    </div>
                );
        }
    };

    const renderAvailabilityBadge = (investment: typeof enhancedInvestments[0]) => {
        if (investment.isImmediatePurchased) {
            return (
                <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-600">
                    <CheckCircle className="mr-1" size={12}/>
                    Purchased
                </span>
            );
        }

        if (investment.isImmediate && !investment.isImmediatePurchased) {
            return (
                <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-300 border border-yellow-600">
                    <Zap className="mr-1" size={12}/>
                    Immediate
                </span>
            );
        }

        if (investment.pricing?.availability === 'continue') {
            return (
                <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-600">
                    <ArrowRight className="mr-1" size={12}/>
                    Continue
                </span>
            );
        }

        if (investment.pricing?.availability === 'not_available') {
            return (
                <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-600">
                    <Ban className="mr-1" size={12}/>
                    N/A
                </span>
            );
        }

        return null;
    };

    if (isLoadingPricing && currentRound > 1) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <span className="ml-3 text-gray-300">Loading pricing information...</span>
            </div>
        );
    }

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

            {/* Continuation Pricing Legend */}
            {currentRound > 1 && (
                <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                    <div className="flex items-center mb-2">
                        <Info className="w-4 h-4 text-blue-400 mr-2"/>
                        <span className="text-sm font-medium text-blue-300">Continuation Pricing</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                            <span className="text-gray-300">Continue = Reduced Price</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                            <span className="text-gray-300">Fresh = Full Price</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
                            <span className="text-gray-300">N/A = Not Available</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Investment Options */}
            <div className="space-y-3">
                {enhancedInvestments.map((investment) => (
                    <div
                        key={investment.id}
                        className={getInvestmentCardClasses(investment)}
                        onClick={() => {
                            if (investment.isDisabled || isSubmitting) return;

                            if (investment.isImmediate && !investment.isImmediatePurchased) {
                                setShowImmediateModal(investment.index);
                            } else {
                                onInvestmentToggle(investment.index);
                            }
                        }}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="font-medium text-white">
                                        {investment.id}. {investment.name}
                                    </span>
                                    {renderAvailabilityBadge(investment)}
                                </div>

                                {investment.description && (
                                    <p className="text-xs text-gray-300 leading-relaxed mb-2">
                                        {investment.description}
                                    </p>
                                )}

                                {investment.pricing?.reason && investment.pricing.availability !== 'fresh' && (
                                    <p className="text-xs text-gray-400 italic">
                                        {investment.pricing.reason}
                                    </p>
                                )}
                            </div>

                            {renderPricingInfo(investment)}
                        </div>

                        {/* Selection Indicator */}
                        {investment.isSelected && !investment.isDisabled && (
                            <div className="absolute top-2 right-2">
                                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-3 h-3 text-white"/>
                                </div>
                            </div>
                        )}

                        {/* Disabled Overlay */}
                        {investment.isDisabled && (
                            <div
                                className="absolute inset-0 bg-gray-900/30 rounded-lg flex items-center justify-center">
                                {investment.pricing?.availability === 'not_available' && (
                                    <Ban className="w-8 h-8 text-gray-500"/>
                                )}
                            </div>
                        )}
                    </div>
                ))}
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

export default EnhancedInvestmentPanel;
