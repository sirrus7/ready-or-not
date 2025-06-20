// src/shared/components/UI/Leaderboard/UnifiedLeaderboard.tsx
// Modern styled component with epic Net Income winner reveal

import React, {useState, useEffect} from 'react';
import {Crown, Trophy, TrendingUp, TrendingDown, DollarSign, Target, Package, Zap} from 'lucide-react';
import {LeaderboardItem} from './types';

interface UnifiedLeaderboardProps {
    leaderboardData: LeaderboardItem[];
    kpiLabel: string;
    secondaryKpiLabel?: string;
    roundDisplay: string;
    dataKey: string;
    isDualBar: boolean;
    isNetIncomeReveal?: boolean;
}

const UnifiedLeaderboard: React.FC<UnifiedLeaderboardProps> = ({
                                                                   leaderboardData,
                                                                   kpiLabel,
                                                                   roundDisplay,
                                                                   dataKey,
                                                                   isDualBar,
                                                                   isNetIncomeReveal = false
                                                               }) => {
    // Animation states
    const [isVisible, setIsVisible] = useState(false);
    const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

    // Net Income reveal state
    const [revealStage, setRevealStage] = useState(-1);

    // Reset reveal stage when isNetIncomeReveal changes
    useEffect(() => {
        if (isNetIncomeReveal) {
            setRevealStage(0); // Start the reveal
        }
    }, [isNetIncomeReveal]);

    // Get metric icon
    const getMetricIcon = () => {
        if (dataKey.includes('capacity') || dataKey.includes('capord')) return <Package className="w-6 h-6"/>;
        if (dataKey.includes('cost') || dataKey.includes('cpb')) return <TrendingDown className="w-6 h-6"/>;
        if (dataKey.includes('asp')) return <DollarSign className="w-6 h-6"/>;
        if (dataKey.includes('revenue')) return <TrendingUp className="w-6 h-6"/>;
        if (dataKey.includes('margin')) return <Target className="w-6 h-6"/>;
        if (dataKey.includes('income')) return <Trophy className="w-6 h-6"/>;
        return <Zap className="w-6 h-6"/>;
    };

    // Get gradient color scheme
    const getGradientScheme = () => {
        if (dataKey.includes('capord')) return 'from-blue-500 to-blue-600';
        if (dataKey.includes('cpb')) return 'from-red-500 to-red-600';
        if (dataKey.includes('costs')) return 'from-orange-500 to-orange-600';
        if (dataKey.includes('asp')) return 'from-green-500 to-green-600';
        if (dataKey.includes('revenue')) return 'from-orange-500 to-orange-600';
        if (dataKey.includes('margin')) return 'from-purple-500 to-purple-600';
        if (dataKey.includes('income')) return 'from-yellow-400 to-yellow-600';
        return 'from-gray-500 to-gray-600';
    };

    // Animation triggers
    useEffect(() => {
        setIsVisible(true);
    }, []);

    // Handle Net Income reveal animation sequence
    useEffect(() => {
        if (isNetIncomeReveal && revealStage >= 0 && revealStage < 4) {
            const delays = [500, 1500, 2000, 2500]; // Timing for each reveal
            const timer = setTimeout(() => {
                setRevealStage(revealStage + 1);
            }, delays[revealStage]);

            return () => clearTimeout(timer);
        }
    }, [revealStage, isNetIncomeReveal]);

    // Sort data appropriately
    const sortedData = [...leaderboardData].sort((a, b) => a.rank - b.rank);
    // For Net Income reveal, only show top 3 teams in reverse order (3rd, 2nd, 1st)
    const revealData = isNetIncomeReveal
        ? [...leaderboardData].filter(team => team.rank <= 3).sort((a, b) => b.rank - a.rank)
        : sortedData;

    const maxPrimary = Math.max(...leaderboardData.map(item => item.value));
    const maxSecondary = Math.max(...leaderboardData.map(item => {
        const secVal = item.secondaryValue ? parseFloat(item.secondaryValue.replace(/,/g, '')) : 0;
        return secVal;
    }));

    if (isNetIncomeReveal) {
        // Special Net Income Winner Reveal with Podium
        return (
            <div
                className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 relative overflow-hidden">
                {/* Animated background patterns */}
                <div className="absolute inset-0 opacity-10">
                    <div
                        className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"/>
                    <div
                        className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl animate-pulse"
                        style={{animationDelay: '2s'}}/>
                </div>

                {/* Header */}
                <div className="text-center mb-12 relative z-10">
                    <h1 className="text-6xl md:text-7xl font-black text-white mb-4">
                        🏆 {roundDisplay.toUpperCase()} WINNER! 🏆
                    </h1>
                    <p className="text-2xl md:text-3xl text-yellow-400 font-bold">
                        NET INCOME
                    </p>
                </div>

                {/* Podium-style reveal */}
                <div className="relative z-10 w-full max-w-5xl px-8">
                    {revealData.length === 0 ? (
                        <div className="text-center text-white">
                            <p className="text-xl">Loading teams...</p>
                        </div>
                    ) : (
                        <div className="flex items-end justify-center gap-4 h-[400px]">
                            {revealData.map((team, index) => {
                                const shouldShow = revealStage > index;
                                const isWinner = team.rank === 1;
                                const isLatest = revealStage === index + 1;

                                // Podium heights
                                const heights: { [key: number]: string } = {1: 'h-72', 2: 'h-56', 3: 'h-40'};
                                const podiumHeight = heights[team.rank] || 'h-40';

                                // Calculate flex order to position podiums correctly (2nd, 1st, 3rd)
                                const flexOrder = team.rank === 2 ? 0 : team.rank === 1 ? 1 : 2;

                                return (
                                    <div
                                        key={team.teamName}
                                        className={`flex-1 transform transition-all duration-1000 ${
                                            shouldShow ? 'opacity-100' : 'opacity-0'
                                        }`}
                                        style={{
                                            transform: shouldShow ? 'translateY(0)' : 'translateY(20px)',
                                            transitionDelay: `${index * 200}ms`,
                                            order: flexOrder
                                        }}
                                    >
                                        {/* Team name and value */}
                                        <div className={`text-center mb-4 ${isLatest ? 'animate-pulse' : ''}`}>
                                            <p className={`text-xl font-bold mb-2 ${
                                                isWinner ? 'text-yellow-400' : 'text-white'
                                            }`}>
                                                {team.teamName}
                                            </p>
                                            <p className={`text-3xl font-black ${
                                                isWinner ? 'text-yellow-400' : 'text-gray-300'
                                            }`}>
                                                {team.formattedValue}
                                            </p>
                                            {isWinner && revealStage >= 3 && (
                                                <Crown className="w-12 h-12 text-yellow-400 mx-auto mt-2"/>
                                            )}
                                        </div>

                                        {/* Podium */}
                                        <div className={`${podiumHeight} relative rounded-t-lg ${
                                            isWinner
                                                ? 'bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-2xl shadow-yellow-400/50'
                                                : team.rank === 2
                                                    ? 'bg-gradient-to-b from-gray-400 to-gray-600'
                                                    : 'bg-gradient-to-b from-orange-700 to-orange-900'
                                        }`}>
                                            <div className="absolute inset-x-0 top-4 text-center">
                                                <span className={`text-5xl font-black ${
                                                    isWinner ? 'text-yellow-900' : 'text-white'
                                                }`}>
                                                    {team.rank}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Standard leaderboard display with modern styling
    return (
        <div
            className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-8">
            {/* Header with icon */}
            <div className={`text-center mb-10 transform transition-all duration-700 ${
                isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
            }`}>
                <div className="flex items-center justify-center gap-3 mb-2">
                    <div className={`p-3 bg-gradient-to-r ${getGradientScheme()} rounded-lg text-white`}>
                        {getMetricIcon()}
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-white">
                        {roundDisplay.toUpperCase()}
                    </h1>
                </div>
                <p className={`text-3xl font-bold bg-gradient-to-r ${getGradientScheme()} bg-clip-text text-transparent`}>
                    {isDualBar ? 'CAPACITY & ORDERS' : kpiLabel.toUpperCase()}
                </p>
            </div>

            {/* Leaderboard */}
            <div className="w-full max-w-4xl space-y-4">
                {isDualBar ? (
                    // Dual bar mode for Capacity & Orders
                    sortedData.map((team, index) => {
                        const capWidth = (team.value / maxPrimary) * 100;
                        const ordWidth = (parseFloat(team.secondaryValue?.replace(/,/g, '') || '0') / maxSecondary) * 100;
                        const isLeader = team.rank === 1;

                        return (
                            <div
                                key={team.teamName}
                                className={`transform transition-all duration-700 ${
                                    isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'
                                }`}
                                style={{transitionDelay: `${index * 100}ms`}}
                            >
                                {/* Rank badge and team name */}
                                <div className="flex items-center gap-4 mb-3">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                                            isLeader
                                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900'
                                                : 'bg-gray-700 text-gray-300'
                                        }`}>
                                        {team.rank}
                                    </div>
                                    <span className="text-xl font-bold text-white flex-1">
                                        {team.teamName}
                                        {isLeader && <Trophy className="inline-block ml-2 w-5 h-5 text-yellow-400"/>}
                                    </span>
                                </div>

                                {/* Capacity bar */}
                                <div className="mb-2 pl-16">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-blue-400">CAPACITY</span>
                                        <span className="text-sm font-bold text-gray-400">{team.formattedValue}</span>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg overflow-hidden h-8">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                                            style={{width: `${Math.max(capWidth, 15)}%`}}
                                        />
                                    </div>
                                </div>

                                {/* Orders bar */}
                                <div className="pl-16">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-yellow-400">ORDERS</span>
                                        <span className="text-sm font-bold text-gray-400">{team.secondaryValue}</span>
                                    </div>
                                    <div className="bg-gray-800 rounded-lg overflow-hidden h-8">
                                        <div
                                            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600"
                                            style={{width: `${Math.max(ordWidth, 15)}%`}}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    // Single bar mode
                    sortedData.map((team, index) => {
                        const width = (team.value / maxPrimary) * 100;
                        const isLeader = team.rank === 1;

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
                                            {/* Progress bar */}
                                            <div
                                                className={`h-16 bg-gradient-to-r ${getGradientScheme()} transition-all duration-1000 ease-out`}
                                                style={{width: `${Math.max(width, 15)}%`}}
                                            >
                                                {/* Shimmer effect on hover */}
                                                {hoveredTeam === team.teamName && (
                                                    <div
                                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"/>
                                                )}
                                            </div>

                                            {/* Team info overlay */}
                                            <div className="absolute inset-0 flex items-center justify-between px-6">
                                                <span className={`text-xl font-bold ${
                                                    hoveredTeam === team.teamName ? 'text-white' : 'text-gray-200'
                                                } transition-colors`}>
                                                    {team.teamName}
                                                    {isLeader &&
                                                        <Trophy className="inline-block ml-2 w-5 h-5 text-yellow-400"/>}
                                                </span>
                                                <span className="text-2xl font-black text-white">
                                                    {team.formattedValue}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
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
