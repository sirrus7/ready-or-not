// src/views/team/components/GameStatus/TeamStatus.tsx
import React from 'react';
import {Hourglass} from 'lucide-react';
import KpiDisplay from './KpiDisplay';
import {Slide, TeamRoundData} from '@shared/types';

interface TeamStatusDisplayProps {
    teamName: string | null;
    // REFACTOR: Accept the slide object directly
    currentSlide: Slide | null;
    teamKpis: TeamRoundData | null;
    isLoading: boolean;
}

const TeamStatusDisplay: React.FC<TeamStatusDisplayProps> = ({
                                                                 teamName,
                                                                 currentSlide,
                                                                 teamKpis,
                                                                 isLoading
                                                             }) => {
    const kpiRoundLabel = currentSlide?.round_number ?
        `RD-${currentSlide.round_number} Status`
        : (teamName ? "Connecting..." : "Game Setup");

    return (
        <div className="flex-shrink-0 sticky top-0 z-10">
            <KpiDisplay
                teamName={teamName}
                currentRoundLabel={isLoading ? "Loading..." : kpiRoundLabel}
                kpis={teamKpis}
            />
            {isLoading && currentSlide?.round_number > 0 && (
                <div className="bg-yellow-900/30 border-b border-yellow-700 p-2 text-center">
                    <div className="flex items-center justify-center text-yellow-400 text-sm">
                        <Hourglass size={16} className="mr-2 animate-pulse"/>
                        Loading data for {currentSlide.title}...
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamStatusDisplay;
