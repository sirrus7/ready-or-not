// src/views/team/hooks/useInvestmentPricing.ts
// Hook to manage investment pricing data with continuation pricing

import {useState, useEffect} from 'react';
import {
    ContinuationPricingEngine,
    InvestmentPricing,
    ContinuationPricingResult
} from '@core/game/ContinuationPricingEngine';

export interface UseInvestmentPricingProps {
    sessionId: string;
    teamId: string;
    currentRound: 1 | 2 | 3;
    enabled?: boolean;
}

export interface UseInvestmentPricingReturn {
    pricingData: ContinuationPricingResult | null;
    investmentPricing: InvestmentPricing[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export const useInvestmentPricing = ({
                                         sessionId,
                                         teamId,
                                         currentRound,
                                         enabled = true
                                     }: UseInvestmentPricingProps): UseInvestmentPricingReturn => {
    const [pricingData, setPricingData] = useState<ContinuationPricingResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPricingData = async () => {
        if (!enabled || !sessionId || !teamId || currentRound === 1) {
            setPricingData(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log(`[useInvestmentPricing] Loading pricing for team ${teamId}, round ${currentRound}`);

            const result = await ContinuationPricingEngine.calculateContinuationPricing(
                sessionId,
                teamId,
                currentRound as 2 | 3
            );

            setPricingData(result);
            console.log(`[useInvestmentPricing] ✅ Loaded pricing data:`, result);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load pricing data';
            console.error(`[useInvestmentPricing] ❌ Error loading pricing:`, err);
            setError(errorMessage);
            setPricingData(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPricingData();
    }, [sessionId, teamId, currentRound, enabled]);

    return {
        pricingData,
        investmentPricing: pricingData?.investmentPricing || [],
        isLoading,
        error,
        refresh: loadPricingData
    };
};
