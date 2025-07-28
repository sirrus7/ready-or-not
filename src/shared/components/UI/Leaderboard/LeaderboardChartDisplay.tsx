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
    formatValueForDisplay, calculateConsolidatedNetIncome
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
                                                                             teamRoundData: propTeamRoundData,
                                                                             teamDecisions: propTeamDecisions // NEW: Accept team decisions prop
                                                                         }) => {
    // Safely try to get data from AppContext
    const gameContext = useSafeGameContext();
    const contextState = gameContext?.state;

    const teams = propTeams || contextState?.teams || [];
    const teamRoundData = propTeamRoundData || contextState?.teamRoundData || {};
    // FIXED: Convert nested teamDecisions structure to flat array
    const teamDecisions = propTeamDecisions || (contextState?.teamDecisions ?
        Object.values(contextState.teamDecisions).flatMap(teamDecisionsByPhase =>
            Object.values(teamDecisionsByPhase)
        ) : []);

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

        if (dataKey === 'rd3_leaderboard_consolidated_income') {
            const dataForConsolidated = teams.map(team => {
                const consolidatedNetIncome = calculateConsolidatedNetIncome(teamRoundData, team.id, teamDecisions);
                return {
                    team,
                    consolidatedNetIncome
                };
            });

            const sortedItems = dataForConsolidated.map(({team, consolidatedNetIncome}) => ({
                teamName: team.name,
                value: consolidatedNetIncome,
                formattedValue: formatValueForDisplay(consolidatedNetIncome, 'net_income'),
                rank: 0
            }));

            sortedItems.sort((a, b) => b.value - a.value);
            return sortedItems.map((item, index) => ({
                ...item,
                rank: index + 1
            }));
        }

        const dataForRound: { team: Team; roundData: TeamRoundData | undefined }[] = teams.map(team => ({
            team,
            roundData: teamRoundData[team.id]?.[currentRoundForDisplay]
        }));

        const itemsWithValues = dataForRound
            .map(({team, roundData}) => {
                if (!roundData) return null;

                // UPDATED: Pass team decisions and team ID for comprehensive cost calculation
                const value = calculateKpiValue(roundData, metric, teamDecisions, team.id);
                const formattedValue = formatValueForDisplay(value, metric);

                // For capacity & orders, show both values
                let secondaryValue: string | undefined;
                let effectiveValue = value;

                if (secondaryMetric) {
                    // UPDATED: Pass team decisions and team ID for secondary metric too
                    const secValue = calculateKpiValue(roundData, secondaryMetric, teamDecisions, team.id);
                    secondaryValue = formatValueForDisplay(secValue, secondaryMetric);

                    // For capacity & orders leaderboard, rank by minimum (intersection)
                    if (dataKey.includes('capord')) {
                        effectiveValue = Math.min(value, secValue);
                    }
                }

                return {
                    teamName: team.name,
                    value: value,
                    formattedValue,
                    secondaryValue,
                    effectiveValue,
                    rank: 0 // Will be set after sorting
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        // Sort by effectiveValue for capacity & orders, otherwise by value
        const sortedItems = itemsWithValues.sort((a, b) => {
            const aRankValue = a.effectiveValue ?? a.value;
            const bRankValue = b.effectiveValue ?? b.value;
            return higherIsBetter ? bRankValue - aRankValue : aRankValue - bRankValue;
        });

        return sortedItems.map((item, index) => ({
            ...item,
            rank: index + 1
        }));
    }, [teams, teamRoundData, teamDecisions, currentRoundForDisplay, metric, secondaryMetric, higherIsBetter]); // NEW: Add teamDecisions dependency

    // Determine round display text
    const roundDisplay = useMemo(() => {
        if (!currentRoundForDisplay) return 'RD';

        if (dataKey.includes('rd3_leaderboard')) {
            return 'FINAL RDS 1-3';
        }

        return `RD-${currentRoundForDisplay}`;
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
            key={dataKey}
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
