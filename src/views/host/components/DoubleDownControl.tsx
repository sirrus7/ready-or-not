// src/views/host/components/DoubleDownControl.tsx
import React, {useState, useEffect} from 'react';
import {Dice1, AlertCircle, CheckCircle} from 'lucide-react';
import {db} from '@shared/services/supabase';
import {SLIDE_TO_INVESTMENT_MAP, getInvestmentBySlideId} from '@core/content/DoubleDownMapping';

interface DoubleDownControlProps {
    currentSlideId: number;
    sessionId: string;
}

interface InvestmentRollStatus {
    investmentId: string;
    investmentName: string;
    hasRolled: boolean;
    teamsAffected: number;
}

const DoubleDownControl: React.FC<DoubleDownControlProps> = ({currentSlideId, sessionId}) => {
    const [rollStatuses, setRollStatuses] = useState<InvestmentRollStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (currentSlideId >= 185 && currentSlideId <= 194) {
            loadRollStatuses();
        }
    }, [currentSlideId, sessionId]);

    const loadRollStatuses = async () => {
        setIsLoading(true);

        try {
            // Get all investment statuses using the centralized mapping
            const statuses: InvestmentRollStatus[] = [];

            for (const [slideId, investment] of Object.entries(SLIDE_TO_INVESTMENT_MAP)) {
                const existingResult = await db.doubleDown.getResultForInvestment(sessionId, investment.id);
                const teamsForInvestment = await db.doubleDown.getTeamsForInvestment(sessionId, investment.id);

                statuses.push({
                    investmentId: investment.id,
                    investmentName: investment.name,
                    hasRolled: !!existingResult,
                    teamsAffected: teamsForInvestment.length
                });
            }

            setRollStatuses(statuses);
        } catch (error) {
            console.error('Error loading roll statuses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Only show control on dice roll slides
    if (currentSlideId < 185 || currentSlideId > 194) {
        return null;
    }

    const currentInvestment = getInvestmentBySlideId(currentSlideId);
    const currentStatus = rollStatuses.find(s => s.investmentId === currentInvestment?.id);

    return (
        <div className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Dice1 className="mr-2"/>
                Double Down Dice Control
            </h3>

            {/* Current Investment Status */}
            {currentInvestment && currentStatus && (
                <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-300">Current Investment:</p>
                            <p className="text-white font-medium">{currentInvestment.name}</p>
                            <p className="text-xs text-gray-400">Investment ID: {currentInvestment.id}</p>
                        </div>
                        <div className="text-right">
                            {currentStatus.hasRolled ? (
                                <span className="flex items-center text-green-400 text-sm">
                                    <CheckCircle className="w-4 h-4 mr-1"/>
                                    Rolled
                                </span>
                            ) : currentStatus.teamsAffected > 0 ? (
                                <span className="text-yellow-400 text-sm">
                                    {currentStatus.teamsAffected} team{currentStatus.teamsAffected !== 1 ? 's' : ''} waiting
                                </span>
                            ) : (
                                <span className="text-gray-500 text-sm">No teams</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span className="text-gray-300 text-sm">Loading roll statuses...</span>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-game-orange-800/30">
                <p className="text-xs text-blue-300 flex items-start">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5"/>
                    Click "Roll the Dice!" on the display to roll for each investment. Teams see the same roll result.
                </p>
            </div>

            {/* Debug Info (remove in production) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-2 bg-gray-900/50 rounded text-xs text-gray-400">
                    <p>Debug: Slide {currentSlideId} →
                        Investment {currentInvestment?.id} ({currentInvestment?.name})</p>
                    {currentStatus && (
                        <p>Status: {currentStatus.teamsAffected} teams,
                            rolled: {currentStatus.hasRolled ? 'yes' : 'no'}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default DoubleDownControl;
