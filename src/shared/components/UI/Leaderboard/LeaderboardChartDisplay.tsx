// src/shared/components/UI/Leaderboard/LeaderboardChartDisplay.tsx
import React, {useMemo} from 'react';
import {useGameContext} from '@app/providers/GameProvider.tsx';
import {Team, TeamRoundData} from '@shared/types/database';
import {Trophy} from 'lucide-react';
import {LeaderboardChartDisplayProps, LeaderboardItem} from './types';
import {
    getDataKeyFromSlideId,
    getMetricAndSortOrder,
    calculateKpiValue,
    formatValueForDisplay
} from './utils';
import UnifiedLeaderboard from './UnifiedLeaderboard';

// Hook to safely get game context
const useSafeGameContext = () => {
    try {
        return useGameContext();
    } catch (error) {
        return null;
    }
};

const LeaderboardChartDisplay: React.FC<LeaderboardChartDisplayProps> = ({
                                                                             slideId,
                                                                             currentRoundForDisplay,
                                                                             teams: propTeams,
                                                                             teamRoundData: propTeamRoundData
                                                                         }) => {
    // Safely try to get data from AppContext
    const gameContext = useSafeGameContext();
    const contextState = gameContext?.state;

    const teams = propTeams || contextState?.teams || [];
    const teamRoundData = propTeamRoundData || contextState?.teamRoundData || {};

    // Generate dataKey from slideId
    const dataKey = useMemo(() => getDataKeyFromSlideId(slideId), [slideId]);

    const {
        metric,
        kpiLabel,
        higherIsBetter,
        secondaryMetric,
        secondaryKpiLabel
    } = useMemo(() => getMetricAndSortOrder(dataKey), [dataKey]);

    const leaderboardData = useMemo((): LeaderboardItem[] => {
        if (!currentRoundForDisplay || teams.length === 0) return [];

        const dataForRound: { team: Team; roundData: TeamRoundData | undefined }[] = teams.map(team => ({
            team,
            roundData: teamRoundData[team.id]?.[currentRoundForDisplay]
        }));

        const itemsWithValues = dataForRound
            .map(({team, roundData}) => {
                if (!roundData) return null;

                const value = calculateKpiValue(roundData, metric);
                const formattedValue = formatValueForDisplay(value, metric);

                // For capacity & orders, show both values
                let secondaryValue: string | undefined;
                if (secondaryMetric) {
                    const secValue = calculateKpiValue(roundData, secondaryMetric);
                    secondaryValue = formatValueForDisplay(secValue, secondaryMetric);
                }

                return {
                    teamName: team.name,
                    value,
                    formattedValue,
                    secondaryValue,
                    rank: 0 // Will be set after sorting
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        // Sort by value
        const sortedItems = itemsWithValues.sort((a, b) =>
            higherIsBetter ? b.value - a.value : a.value - b.value
        );

        // Assign ranks
        return sortedItems.map((item, index) => ({
            ...item,
            rank: index + 1
        }));
    }, [teams, teamRoundData, currentRoundForDisplay, metric, secondaryMetric, higherIsBetter]);

    // Determine round display text
    const roundDisplay = useMemo(() => {
        if (!currentRoundForDisplay) return 'Round';

        // Check if this is a final leaderboard
        if (dataKey.includes('rd3_leaderboard')) {
            return 'Final Round 3';
        }

        return `Round ${currentRoundForDisplay}`;
    }, [currentRoundForDisplay, dataKey]);

    // Check leaderboard type
    const isCapacityOrdersLeaderboard = dataKey.includes('capord');
    const isNetIncomeLeaderboard = dataKey.includes('income');

    if (leaderboardData.length === 0) {
        return (
            <div
                className="h-full w-full flex flex-col items-center justify-center p-4 md:p-8 bg-gray-800 text-white rounded-lg shadow-2xl">
                <Trophy size={48} className="text-yellow-400 mb-4"/>
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center">No Data Available</h2>
                <p className="text-gray-400 text-center">Leaderboard data not yet available for this round.</p>
            </div>
        );
    }

    // Use unified component for all leaderboard types
    return (
        <UnifiedLeaderboard
            leaderboardData={leaderboardData}
            kpiLabel={kpiLabel}
            secondaryKpiLabel={secondaryKpiLabel}
            roundDisplay={roundDisplay}
            dataKey={dataKey}
            isDualBar={isCapacityOrdersLeaderboard}
            isNetIncomeReveal={isNetIncomeLeaderboard}
        />
    );
};

export default LeaderboardChartDisplay;
