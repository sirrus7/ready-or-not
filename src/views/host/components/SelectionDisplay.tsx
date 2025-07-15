// src/views/host/components/SelectionDisplay.tsx
// Professional, clean component for displaying team selection data

import React from 'react';
import {InvestmentDisplayUtils} from "@shared/utils/InvestmentDisplayUtils.ts";

const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

export interface SelectionData {
    type: 'investment' | 'choice' | 'none';
    investments?: Array<{
        id: string;
        name: string;
        cost?: number;
        isImmediate?: boolean;
    }>;
    totalBudget?: number;
    choiceText?: string;
    hasSubmission: boolean;
}

interface SelectionDisplayProps {
    selectionData: SelectionData;
}

const SelectionDisplay: React.FC<SelectionDisplayProps> = ({selectionData}) => {
    const {type, investments, totalBudget, choiceText, hasSubmission} = selectionData;

    if (!hasSubmission) {
        return (
            <div className="text-gray-400 text-sm">
                No submission yet
            </div>
        );
    }

    switch (type) {
        case 'investment':
            if (!investments || investments.length === 0) {
                return (
                    <div className="text-gray-500 text-sm">
                        <div>No investments selected</div>
                        {totalBudget !== undefined && (
                            <div className="text-xs text-gray-400 mt-1">
                                {formatCurrency(totalBudget)} spent
                            </div>
                        )}
                    </div>
                );
            }

            return (
                <div className="text-sm">
                    <div className="space-y-1">
                        {investments.map((investment, index) => (
                            <div key={`${investment.id}-${index}`} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-gray-700">{InvestmentDisplayUtils.getDisplayId(investment.id, true)}. {investment.name}</span>
                                    {investment.isImmediate && (
                                        <span
                                            className="ml-2 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                            Instant
                                        </span>
                                    )}
                                </div>
                                <span className="text-gray-500 text-sm ml-4">
                                    {formatCurrency(investment.cost || 0)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {totalBudget !== undefined && (
                        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
                            <span className="text-sm font-medium text-gray-700">Total:</span>
                            <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(totalBudget)}
                            </span>
                        </div>
                    )}
                </div>
            );

        case 'choice':
            return (
                <div className="text-gray-700 text-sm font-medium">
                    {choiceText}
                </div>
            );

        default:
            return (
                <div className="text-sm text-gray-600">
                    Submitted
                </div>
            );
    }
};

export default SelectionDisplay;
