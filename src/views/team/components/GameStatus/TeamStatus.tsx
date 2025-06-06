// src/pages/TeamDisplayPage/components/TeamStatusDisplay.tsx - KPIs + waiting states
import React from 'react';
import {Hourglass} from 'lucide-react';
import KpiDisplay from './KpiDisplay';
import {GamePhaseNode, TeamRoundData} from '@shared/types/common';

interface TeamStatusDisplayProps {
    teamName: string | null;
    currentPhase: GamePhaseNode | null;
    teamKpis: TeamRoundData | null;
    isLoading: boolean;
}

const TeamStatusDisplay: React.FC<TeamStatusDisplayProps> = ({
                                                                 teamName,
                                                                 currentPhase,
                                                                 teamKpis,
                                                                 isLoading
                                                             }) => {
    const kpiRoundLabel = currentPhase?.round_number ?
        `RD-${currentPhase.round_number} ${currentPhase.phase_type === 'kpi' || currentPhase.phase_type === 'leaderboard' ? 'Final ' : ''}Status`
        : (teamName ? "Connecting..." : "Game Setup");

    return (
        <div className="flex-shrink-0 sticky top-0 z-10">
            <KpiDisplay
                teamName={teamName}
                currentRoundLabel={isLoading ? "Loading..." : kpiRoundLabel}
                kpis={teamKpis}
            />
            {isLoading && currentPhase?.round_number > 0 && (
                <div className="bg-yellow-900/30 border-b border-yellow-700 p-2 text-center">
                    <div className="flex items-center justify-center text-yellow-400 text-sm">
                        <Hourglass size={16} className="mr-2 animate-pulse"/>
                        Loading data for {currentPhase.label}...
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamStatusDisplay;
