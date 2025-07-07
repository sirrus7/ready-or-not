// src/shared/components/UI/Leaderboard/UnifiedLeaderboard.tsx
import React, {useState, useEffect, useMemo} from 'react';
import {Trophy, TrendingUp, DollarSign, BarChart2, Target, Package, Zap} from 'lucide-react';
import {LeaderboardItem} from './types';

interface UnifiedLeaderboardProps {
    leaderboardData: LeaderboardItem[];
    kpiLabel: string;
    secondaryKpiLabel?: string;
    roundDisplay: string;
    dataKey: string;
    isDualBar?: boolean;
    isNetIncomeReveal?: boolean;
}

const UnifiedLeaderboard: React.FC<UnifiedLeaderboardProps> = ({
                                                                   leaderboardData,
                                                                   kpiLabel,
                                                                   secondaryKpiLabel,
                                                                   roundDisplay,
                                                                   dataKey,
                                                                   isDualBar = false,
                                                                   isNetIncomeReveal = false
                                                               }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
    const [revealStage, setRevealStage] = useState(0);

    // Calculate responsive sizing based on team count
    const teamCount = leaderboardData.length;
    const barSpacing = teamCount > 5 ? '2' : '4';

    useEffect(() => {
        // Don't set visible immediately for Net Income reveal
        if (!isNetIncomeReveal) {
            setIsVisible(true);
        }
    }, [isNetIncomeReveal]);

    // At the top of the component, add these calculations for dual bars:
    const maxCombinedValue = useMemo(() => {
        if (!isDualBar) return 0;
        return Math.max(...leaderboardData.map(team =>
            Math.max(
                team.value,
                parseFloat(team.secondaryValue?.replace(/,/g, '') || '0')
            )
        ));
    }, [leaderboardData, isDualBar]);

    // Sort data appropriately
    const sortedData = useMemo(() => {
        return [...leaderboardData].sort((a, b) => a.rank - b.rank);
    }, [leaderboardData]);

    // Calculate max values for bar scaling
    const maxPrimary = useMemo(() =>
        Math.max(...sortedData.map(item => item.value)), [sortedData]
    );

    const getGradientScheme = () => {
        if (dataKey.includes('revenue')) return 'from-purple-500 to-purple-600';
        if (dataKey.includes('income')) return 'from-orange-500 to-orange-600';
        if (dataKey.includes('margin')) return 'from-indigo-500 to-indigo-600';
        if (dataKey.includes('asp')) return 'from-red-500 to-red-600';
        if (dataKey.includes('cpb') || dataKey.includes('cost')) return 'from-green-500 to-green-600';
        if (dataKey.includes('capord')) return 'from-blue-500 to-blue-600';
        return 'from-indigo-500 to-indigo-600';
    };

    const getTextColor = () => {
        if (dataKey.includes('revenue')) return 'text-purple-500';      // Purple for Revenue
        if (dataKey.includes('income')) return 'text-orange-500';       // Orange for Net Income
        if (dataKey.includes('margin')) return 'text-indigo-500';       // Light purple for Net Margin
        if (dataKey.includes('asp')) return 'text-red-500';
        if (dataKey.includes('cpb') || dataKey.includes('cost')) return 'text-green-500';
        if (dataKey.includes('capord')) return 'text-blue-500';
        return 'text-indigo-500';
    };

    // Get appropriate icon for the metric
    const getMetricIcon = () => {
        if (dataKey.includes('revenue')) return <TrendingUp className="w-6 h-6"/>;
        if (dataKey.includes('income')) return <DollarSign className="w-6 h-6"/>;
        if (dataKey.includes('margin')) return <BarChart2 className="w-6 h-6"/>;
        if (dataKey.includes('asp')) return <Target className="w-6 h-6"/>;
        if (dataKey.includes('cpb') || dataKey.includes('cost')) return <Package className="w-6 h-6"/>;
        if (dataKey.includes('capord')) return <Zap className="w-6 h-6"/>;
        return <Trophy className="w-6 h-6"/>;
    };

    // Handle special Net Income reveal animation
    useEffect(() => {
        if (isNetIncomeReveal) {
            setRevealStage(0);
        }
    }, [isNetIncomeReveal]);

    useEffect(() => {
        if (isNetIncomeReveal && revealStage < sortedData.length) {
            const timer = setTimeout(() => {
                setRevealStage(prev => prev + 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isNetIncomeReveal, revealStage, sortedData.length]);

    // Special rendering for Net Income (bottom-up reveal)
    if (isNetIncomeReveal) {
        return (
            <div
                className="kpi-display h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-8">
                {/* Header with icon */}
                <div className={`text-center mb-10 transform transition-all duration-700 opacity-100 translate-y-0`}>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        {/* FIXED: Remove gradient background from icon */}
                        <div className={`p-3 bg-gradient-to-r ${getGradientScheme()} rounded-lg text-white`}>
                            {getMetricIcon()}
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-white">
                            {roundDisplay.toUpperCase()}
                        </h1>
                    </div>
                    {/* FIXED: Use solid color instead of gradient text */}
                    <p className={`text-3xl font-bold ${getTextColor()}`}>
                        {kpiLabel.toUpperCase()}
                    </p>
                </div>

                {/* Leaderboard with bottom-up reveal */}
                <div className={`w-full ${teamCount > 5 ? 'max-w-5xl' : 'max-w-4xl'} space-y-${barSpacing}`}>
                    {sortedData.map((team, index) => {
                        const width = (team.value / maxPrimary) * 100;
                        const isLeader = team.rank === 1;

                        // Reverse reveal order: show last place first, first place last
                        const revealIndex = sortedData.length - index - 1;
                        const shouldShow = revealStage > revealIndex;

                        return (
                            <div
                                key={team.teamName}
                                className={`transform hover:scale-[1.02] ${
                                    shouldShow
                                        ? 'translate-x-0 opacity-100 transition-all duration-700'
                                        : 'translate-x-[-100%] opacity-0'
                                }`}
                                style={{
                                    transitionDelay: shouldShow ? `${revealIndex * 300}ms` : '0ms'
                                }}
                                onMouseEnter={() => setHoveredTeam(team.teamName)}
                                onMouseLeave={() => setHoveredTeam(null)}
                            >
                                <div className="relative">
                                    {/* Rank badge */}
                                    <div
                                        className={`absolute -left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                                            isLeader
                                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900'
                                                : 'bg-gray-700 text-gray-300'
                                        }`}>
                                        {team.rank}
                                    </div>

                                    {/* Main bar */}
                                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                                        <div className="relative">
                                            {/* Gray background bar */}
                                            <div className="h-16 bg-gray-700">
                                                {/* Progress bar */}
                                                <div
                                                    className={`h-full bg-gradient-to-r ${getGradientScheme()} transition-all duration-1000 ease-out relative overflow-hidden`}
                                                    style={{width: `${Math.max(width, 15)}%`}}
                                                >
                                                    {/* Value inside colored bar */}
                                                    <div
                                                        className="absolute inset-0 flex items-center justify-end px-6">
                                                        <span className="text-2xl font-black text-white drop-shadow-md">
                                                            {team.formattedValue}
                                                        </span>
                                                    </div>

                                                    {/* Shimmer effect on hover */}
                                                    {hoveredTeam === team.teamName && (
                                                        <div
                                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"/>
                                                    )}
                                                </div>

                                                {/* Team name overlay */}
                                                <div className="absolute inset-0 flex items-center px-6">
                                                    <span className={`text-xl font-bold ${
                                                        hoveredTeam === team.teamName ? 'text-white' : 'text-gray-200'
                                                    } transition-colors drop-shadow-md`}>
                                                        {team.teamName}
                                                        {isLeader &&
                                                            <Trophy
                                                                className="inline-block ml-2 w-6 h-6 text-yellow-900 drop-shadow-lg"/>}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Standard leaderboard display with modern styling
    return (
        <div
            className="kpi-display h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-8">
            {/* Header with icon */}
            <div className={`text-center mb-10 transform transition-all duration-700 ${
                isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
            }`}>
                <div className="flex items-center justify-center gap-3 mb-2">
                    {/* FIXED: Remove gradient background from icon */}
                    <div className={`p-3 bg-gradient-to-r ${getGradientScheme()} rounded-lg text-white`}>
                        {getMetricIcon()}
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-white">
                        {roundDisplay.toUpperCase()}
                    </h1>
                </div>
                <p className="text-3xl font-bold">
                    {isDualBar ? (
                        <>
                            <span className="text-blue-400">{kpiLabel?.toUpperCase()}</span>
                            <span className="text-white"> & </span>
                            <span className="text-yellow-400">{secondaryKpiLabel?.toUpperCase()}</span>
                        </>
                    ) : (
                        /* FIXED: Use solid color instead of gradient text */
                        <span className={getTextColor()}>{kpiLabel.toUpperCase()}</span>
                    )}
                </p>
            </div>

            {/* Leaderboard with responsive sizing */}
            <div className={`w-full ${teamCount > 5 ? 'max-w-5xl' : 'max-w-4xl'} space-y-${barSpacing}`}>
                {sortedData.map((team, index) => {
                    const isLeader = team.rank === 1;

                    if (isDualBar) {
                        // Dual bar mode for Capacity & Orders - compact stacked layout
                        const capWidth = (team.value / maxCombinedValue) * 100;
                        const ordWidth = (parseFloat(team.secondaryValue?.replace(/,/g, '') || '0') / maxCombinedValue) * 100;

                        return (
                            <div
                                key={team.teamName}
                                className={`transform transition-all duration-700 hover:scale-[1.02] ${
                                    isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'
                                }`}
                                style={{transitionDelay: `${index * 100}ms`}}
                                onMouseEnter={() => setHoveredTeam(team.teamName)}
                                onMouseLeave={() => setHoveredTeam(null)}
                            >
                                <div className="relative">
                                    {/* Rank badge */}
                                    <div
                                        className={`absolute -left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                                            isLeader
                                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900'
                                                : 'bg-gray-700 text-gray-300'
                                        }`}>
                                        {team.rank}
                                    </div>

                                    {/* Main bar container */}
                                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                                        {/* Stacked bars */}
                                        <div className="relative">
                                            {/* Capacity bar (top half) */}
                                            <div className="h-8 relative bg-gray-700">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out relative overflow-hidden"
                                                    style={{width: `${Math.max(capWidth, 15)}%`}}
                                                >
                                                    <div
                                                        className="absolute inset-0 flex items-center justify-end px-3">
                                                        <span
                                                            className="text-xs font-bold text-white drop-shadow-md">{kpiLabel}: {team.formattedValue}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Orders bar (bottom half) */}
                                            <div className="h-8 relative bg-gray-700">
                                                <div
                                                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-1000 ease-out relative overflow-hidden"
                                                    style={{width: `${Math.max(ordWidth, 15)}%`}}
                                                >
                                                    <div
                                                        className="absolute inset-0 flex items-center justify-end px-3">
                                                        <span
                                                            className="text-xs font-bold text-gray-900">{secondaryKpiLabel}: {team.secondaryValue}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Team name overlay - positioned within the shorter bar */}
                                            <div
                                                className="absolute inset-0 flex items-center px-4 pointer-events-none">
                                                <div
                                                    className="relative"
                                                    style={{maxWidth: `${Math.min(capWidth, ordWidth)}%`}}
                                                >
                                                    <div
                                                        className="bg-gray-900/80 backdrop-blur-sm rounded-md px-3 py-1 inline-block">
                                                        <span className={`text-lg font-bold ${
                                                            hoveredTeam === team.teamName ? 'text-white' : 'text-gray-100'
                                                        } transition-colors`}>
                                                            {team.teamName}
                                                            {isLeader && <Trophy
                                                                className="inline-block ml-2 w-4 h-4 text-yellow-400"/>}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        // Single bar mode (standard leaderboard)
                        const width = (team.value / maxPrimary) * 100;

                        return (
                            <div
                                key={team.teamName}
                                className={`transform transition-all duration-700 hover:scale-[1.02] ${
                                    isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'
                                }`}
                                style={{transitionDelay: `${index * 100}ms`}}
                                onMouseEnter={() => setHoveredTeam(team.teamName)}
                                onMouseLeave={() => setHoveredTeam(null)}
                            >
                                <div className="relative">
                                    {/* Rank badge */}
                                    <div
                                        className={`absolute -left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                                            isLeader
                                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900'
                                                : 'bg-gray-700 text-gray-300'
                                        }`}>
                                        {team.rank}
                                    </div>

                                    {/* Main bar */}
                                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                                        <div className="relative">
                                            {/* Gray background bar */}
                                            <div className="h-16 bg-gray-700">
                                                {/* Progress bar */}
                                                <div
                                                    className={`h-full bg-gradient-to-r ${getGradientScheme()} transition-all duration-1000 ease-out relative overflow-hidden`}
                                                    style={{width: `${Math.max(width, 15)}%`}}
                                                >
                                                    {/* Value inside colored bar */}
                                                    <div
                                                        className="absolute inset-0 flex items-center justify-end px-6">
                                                        <span className="text-2xl font-black text-white drop-shadow-md">
                                                            {team.formattedValue}
                                                        </span>
                                                    </div>

                                                    {/* Shimmer effect on hover */}
                                                    {hoveredTeam === team.teamName && (
                                                        <div
                                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"/>
                                                    )}
                                                </div>

                                                {/* Team name overlay */}
                                                <div className="absolute inset-0 flex items-center px-6">
                                                    <span className={`text-xl font-bold ${
                                                        hoveredTeam === team.teamName ? 'text-white' : 'text-gray-200'
                                                    } transition-colors drop-shadow-md`}>
                                                        {team.teamName}
                                                        {isLeader &&
                                                            <Trophy
                                                                className="inline-block ml-2 w-5 h-5 text-yellow-400"/>}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                })}
            </div>

            {/* Footer with leader info */}
            {sortedData[0] && (
                <div className={`mt-8 text-center transform transition-all duration-1000 ${
                    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`} style={{transitionDelay: '600ms'}}>
                    <p className="text-xl text-gray-400">
                        Current Leader: <span className="text-yellow-400 font-bold">{sortedData[0].teamName}</span>
                    </p>
                </div>
            )}
        </div>
    );
};

export default UnifiedLeaderboard;
