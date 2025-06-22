// src/views/host/components/DoubleDownControl.tsx
import React, {useState, useEffect} from 'react';
import {Dice1, AlertCircle, CheckCircle} from 'lucide-react';
import {supabase} from '@shared/services/supabase';

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

    // Investment mapping for slides 185-194
    const slideToInvestment: Record<number, { id: string; name: string }> = {
        185: {id: 'A', name: 'Production Efficiency'},
        186: {id: 'B', name: 'Expanded 2nd Shift'},
        187: {id: 'C', name: 'Supply Chain'},
        188: {id: 'D', name: 'Employee Development'},
        189: {id: 'E', name: 'Maximize Boutique'},
        190: {id: 'F', name: 'Big Box Expansion'},
        191: {id: 'G', name: 'ERP'},
        192: {id: 'H', name: 'IT Security'},
        193: {id: 'I', name: 'Product Line'},
        194: {id: 'J', name: 'Automation'}
    };

    useEffect(() => {
        if (currentSlideId >= 185 && currentSlideId <= 194) {
            loadRollStatuses();
        }
    }, [currentSlideId, sessionId]);

    const loadRollStatuses = async () => {
        setIsLoading(true);

        // Get all investment statuses
        const statuses: InvestmentRollStatus[] = [];

        for (const [slideId, investment] of Object.entries(slideToInvestment)) {
            // Check if already rolled
            const {data: existingResult} = await supabase
                .from('double_down_results')
                .select('id')
                .eq('session_id', sessionId)
                .eq('investment_id', investment.id)
                .single();

            // Count teams that chose this investment
            const {count} = await supabase
                .from('team_decisions')
                .select('*', {count: 'exact', head: true})
                .eq('session_id', sessionId)
                .eq('double_down_on_id', investment.id);

            statuses.push({
                investmentId: investment.id,
                investmentName: investment.name,
                hasRolled: !!existingResult,
                teamsAffected: count || 0
            });
        }

        setRollStatuses(statuses);
        setIsLoading(false);
    };

    // Only show control on dice roll slides
    if (currentSlideId < 185 || currentSlideId > 194) {
        return null;
    }

    const currentInvestment = slideToInvestment[currentSlideId];
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

            {/* Instructions */}
            <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
                <p className="text-xs text-blue-300 flex items-start">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5"/>
                    Click "Roll the Dice!" on the display to roll for each investment. Teams see the same roll result.
                </p>
            </div>

            {/* Overview of All Investments */}
            <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-400 font-medium">All Investments Status:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {rollStatuses.map(status => (
                        <div
                            key={status.investmentId}
                            className={`p-2 rounded ${
                                status.hasRolled
                                    ? 'bg-green-900/20 text-green-400'
                                    : status.teamsAffected > 0
                                        ? 'bg-yellow-900/20 text-yellow-400'
                                        : 'bg-gray-900/20 text-gray-500'
                            }`}
                        >
                            <div className="font-medium truncate">{status.investmentName}</div>
                            <div>
                                {status.hasRolled
                                    ? 'Complete'
                                    : status.teamsAffected > 0
                                        ? `${status.teamsAffected} teams`
                                        : 'No teams'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DoubleDownControl;
