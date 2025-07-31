// src/views/team/components/GameStatus/StrategyStatusCard.tsx
import React, {useEffect, useState} from 'react';
import {FileText} from 'lucide-react';
import {decisionService} from '@shared/services/supabase/services/decisionService';
import {StrategyInvestmentDetails} from '@shared/types/game';

interface StrategyStatusCardProps {
    sessionId: string;
    teamId: string;
    currentRound: number;
    className?: string;
}

export const StrategyStatusCard: React.FC<StrategyStatusCardProps> = ({
                                                                          sessionId,
                                                                          teamId,
                                                                          currentRound,
                                                                          className = ''
                                                                      }: StrategyStatusCardProps) => {
    const [strategyDetails, setStrategyDetails] = useState<StrategyInvestmentDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStrategyDetails = async (): Promise<void> => {
            setIsLoading(true);
            try {
                const details: StrategyInvestmentDetails | null = await decisionService.getStrategyInvestmentDetails(sessionId, teamId);
                setStrategyDetails(details);
            } catch (error) {
                console.error('[StrategyStatusCard] Error loading strategy details:', error);
                setStrategyDetails({hasStrategy: false, purchaseRound: null, purchasePhaseId: null});
            } finally {
                setIsLoading(false);
            }
        };

        loadStrategyDetails();
    }, [sessionId, teamId, currentRound]);

    // Don't render if loading, no strategy, or in the same round as purchase
    if (isLoading || !strategyDetails?.hasStrategy || !strategyDetails.purchaseRound) {
        return null;
    }

    // Only show in rounds AFTER the purchase round
    if (currentRound <= strategyDetails.purchaseRound) {
        return null;
    }

    const {purchaseRound} = strategyDetails;

    return (
        <div className={`bg-gray-800/50 rounded-lg p-3 border border-green-500/30 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-400"/>
                    <span className="text-sm font-medium text-green-400">
                    1. Business Growth Strategy
                </span>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-400">Purchased Round {purchaseRound}</div>
                </div>
            </div>
        </div>
    );
};