// src/shared/components/UI/Leaderboard/UnifiedLeaderboard.tsx
// Single component that smoothly transitions between dual and single bar modes
// AND handles the Net Income reveal animation

import React, {useState, useEffect} from 'react';
import {Crown} from 'lucide-react';
import {LeaderboardItem} from './types';
import {getColorScheme, getHeaderTextColor} from './utils';

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
                                                                   secondaryKpiLabel,
                                                                   roundDisplay,
                                                                   dataKey,
                                                                   isDualBar,
                                                                   isNetIncomeReveal = false
                                                               }) => {
    const [currentData, setCurrentData] = useState(leaderboardData);
    const [currentMode, setCurrentMode] = useState(isDualBar);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Net Income reveal state
    const [revealedCount, setRevealedCount] = useState(isNetIncomeReveal ? 0 : leaderboardData.length);
    const [showWinnerCrown, setShowWinnerCrown] = useState(!isNetIncomeReveal);

    const colorScheme = getColorScheme(dataKey);
    const headerTextColor = getHeaderTextColor(dataKey);

    // Handle Net Income reveal animation
    useEffect(() => {
        if (isNetIncomeReveal && revealedCount < leaderboardData.length) {
            const timer = setTimeout(() => {
                setRevealedCount(revealedCount + 1);

                // Show winner crown when all teams are revealed
                if (revealedCount + 1 === leaderboardData.length) {
                    setTimeout(() => setShowWinnerCrown(true), 1000);
                }
            }, 2500); // 2.5 second delay between reveals

            return () => clearTimeout(timer);
        }
    }, [revealedCount, leaderboardData.length, isNetIncomeReveal]);

    // Handle smooth transitions when data or mode changes
    useEffect(() => {
        if (!isNetIncomeReveal && (JSON.stringify(currentData) !== JSON.stringify(leaderboardData) || currentMode !== isDualBar)) {
            setIsTransitioning(true);

            setTimeout(() => {
                setCurrentData(leaderboardData);
                setCurrentMode(isDualBar);

                setTimeout(() => {
                    setIsTransitioning(false);
                }, 1000);
            }, 100);
        } else if (!isNetIncomeReveal) {
            setCurrentData(leaderboardData);
            setCurrentMode(isDualBar);
        }
    }, [leaderboardData, isDualBar, currentData, currentMode, isNetIncomeReveal]);

    // For Net Income reveal, sort by rank (worst to best)
    const displayData = isNetIncomeReveal
        ? [...leaderboardData].sort((a, b) => b.rank - a.rank)
        : currentData;

    const maxPrimary = Math.max(...displayData.map(item => item.value));
    const maxSecondary = Math.max(...displayData.map(item => {
        const secVal = item.secondaryValue ? parseFloat(item.secondaryValue.replace(/,/g, '')) : 0;
        return secVal;
    }));

    const winner = displayData.find(item => item.rank === 1);

    return (
        <div className={`h-full w-full flex flex-col items-center justify-center p-6 text-white ${
            isNetIncomeReveal
                ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
                : 'bg-gradient-to-br from-gray-900 to-gray-800'
        }`}>
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-5xl md:text-6xl font-black mb-2 transition-all duration-1000">
                    {isNetIncomeReveal ? '🏆 ' : ''}
                    {roundDisplay.toUpperCase()}{' '}
                    {currentMode ? (
                        <>
                            <span className="text-sky-400">CAPACITY</span> & <span
                            className="text-yellow-400">ORDERS</span>
                        </>
                    ) : (
                        <span className={isNetIncomeReveal ? 'text-yellow-400' : headerTextColor}>
                            {kpiLabel.toUpperCase()}
                        </span>
                    )}
                    {isNetIncomeReveal ? ' 🏆' : ''}
                </h1>

                {/* Legend */}
                {!isNetIncomeReveal && (
                    <div className="flex justify-center gap-8 mt-4 transition-all duration-1000">
                        {currentMode ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-sky-500 rounded transition-all duration-1000"></div>
                                    <span className="text-lg font-bold text-gray-300">CAPACITY</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-yellow-500 rounded transition-all duration-1000"></div>
                                    <span className="text-lg font-bold text-gray-300">ORDERS</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-6 h-6 ${colorScheme.primary} rounded transition-all duration-1000`}></div>
                                <span className="text-lg font-bold text-gray-300">{kpiLabel.toUpperCase()}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Chart */}
            <div className="w-full max-w-6xl">
                {isNetIncomeReveal ? (
                    /* Net Income Reveal - Simple Stacked Layout */
                    <div className="space-y-4">
                        {/* Show teams in reverse rank order (3rd, 2nd, 1st) but only up to revealedCount */}
                        {[...displayData].reverse().slice(0, revealedCount).reverse().map((item, reverseIndex) => {
                            const actualIndex = revealedCount - 1 - reverseIndex; // Get the actual reveal order
                            const primaryValue = item.value;
                            const primaryWidth = maxPrimary > 0 ? Math.max((primaryValue / maxPrimary) * 100, 10) : 10;
                            const isWinner = item.rank === 1;
                            const isLatestRevealed = actualIndex === revealedCount - 1;

                            return (
                                <div
                                    key={item.teamName}
                                    className={`transition-all duration-1000 ease-out transform ${
                                        isLatestRevealed ? 'animate-pulse scale-105' : ''
                                    }`}
                                    style={{
                                        opacity: actualIndex < revealedCount ? 1 : 0,
                                        transform: `translateY(${actualIndex < revealedCount ? '0px' : '20px'}) scale(${isLatestRevealed ? 1.05 : 1})`
                                    }}
                                >
                                    {/* Team Name Header */}
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className={`text-2xl font-black w-16 flex-shrink-0 ${
                                            isWinner ? 'text-yellow-400' : ''
                                        }`}>
                                            {item.rank === 1 ? '1st.' : item.rank === 2 ? '2nd.' : '3rd.'}
                                        </span>
                                        <span className={`text-2xl font-bold flex-1 truncate ${
                                            isWinner ? 'text-yellow-300' : ''
                                        }`} title={item.teamName}>
                                            {item.teamName}
                                        </span>

                                        {/* Winner Crown and Label */}
                                        {isWinner && showWinnerCrown && (
                                            <div className="flex items-center gap-3 animate-bounce">
                                                <Crown size={32} className="text-yellow-400"/>
                                                <span className="text-2xl font-black text-yellow-400">WINNER!</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Animated Bar */}
                                    <div
                                        className={`relative rounded-lg overflow-hidden shadow-2xl h-16 transition-all duration-1000 ${
                                            isWinner ? 'bg-yellow-600/30 border-2 border-yellow-400' : 'bg-gray-700'
                                        }`}>
                                        <div
                                            className="absolute top-0 left-0 h-full rounded-lg transition-all duration-2000 ease-out"
                                            style={{
                                                width: isLatestRevealed ? `${primaryWidth}%` : actualIndex < revealedCount ? `${primaryWidth}%` : '0%',
                                                backgroundColor: isWinner ? '#fbbf24' : // yellow-400
                                                    item.rank === 2 ? '#9ca3af' : // gray-400
                                                        item.rank === 3 ? '#f97316' : // orange-500
                                                            '#fbbf24', // yellow-400 fallback
                                                transitionDelay: isLatestRevealed ? '0.5s' : '0s' // Delay bar fill for latest
                                            }}
                                        ></div>
                                        <div className="absolute inset-0 flex items-center justify-end pr-4">
                                            <span
                                                className={`text-xl font-bold drop-shadow-lg transition-opacity duration-1000 ${
                                                    isWinner ? 'text-gray-900' : 'text-white'
                                                }`} style={{transitionDelay: isLatestRevealed ? '1s' : '0.5s'}}>
                                                {item.formattedValue}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Regular Leaderboard Layout */
                    <div className="space-y-8">
                        {displayData.map((item, index) => {
                            const primaryValue = item.value;
                            const secondaryValue = item.secondaryValue ? parseFloat(item.secondaryValue.replace(/,/g, '')) : 0;
                            const primaryWidth = maxPrimary > 0 ? Math.max((primaryValue / maxPrimary) * 100, 5) : 5;
                            const secondaryWidth = maxSecondary > 0 ? Math.max((secondaryValue / maxSecondary) * 100, 5) : 5;

                            return (
                                <div key={item.teamName} className="space-y-3">
                                    {/* Team Name Header */}
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl font-black w-16 flex-shrink-0">
                                            {item.rank === 1 ? '1st.' : item.rank === 2 ? '2nd.' : '3rd.'}
                                        </span>
                                        <span className="text-2xl font-bold flex-1 truncate" title={item.teamName}>
                                            {item.teamName}
                                        </span>
                                    </div>

                                    {/* Primary Bar */}
                                    <div
                                        className="relative bg-gray-700 rounded-lg overflow-hidden shadow-lg transition-all duration-1000"
                                        style={{height: currentMode ? '48px' : '56px'}}>
                                        <div
                                            className="absolute top-0 left-0 h-full rounded-lg transition-all duration-1000 ease-out"
                                            style={{
                                                width: `${primaryWidth}%`,
                                                backgroundColor: currentMode ? '#0ea5e9' : // sky-500
                                                    dataKey.includes('cpb') ? '#ef4444' : // red-500
                                                        dataKey.includes('costs') ? '#ea580c' : // orange-600
                                                            dataKey.includes('asp') ? '#22c55e' : // green-500
                                                                dataKey.includes('revenue') ? '#f97316' : // orange-500
                                                                    dataKey.includes('margin') ? '#a855f7' : // purple-500
                                                                        dataKey.includes('income') ? '#fbbf24' : // yellow-400
                                                                            '#3b82f6' // blue-500
                                            }}
                                        ></div>
                                        <div className="absolute inset-0 flex items-center justify-end pr-4">
                                            <span
                                                className="text-xl font-bold text-white drop-shadow-lg transition-opacity duration-1000">
                                                {item.formattedValue}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Secondary Bar (only for dual mode) */}
                                    <div
                                        className="relative bg-gray-700 rounded-lg overflow-hidden shadow-lg transition-all duration-1000"
                                        style={{
                                            height: currentMode ? '48px' : '0px',
                                            opacity: currentMode ? 1 : 0,
                                            marginTop: currentMode ? '12px' : '0px'
                                        }}
                                    >
                                        <div
                                            className="absolute top-0 left-0 h-full bg-yellow-500 rounded-lg transition-all duration-1000 ease-out"
                                            style={{width: `${secondaryWidth}%`}}
                                        ></div>
                                        <div className="absolute inset-0 flex items-center justify-end pr-4">
                                            <span
                                                className="text-xl font-bold text-gray-900 drop-shadow-lg transition-opacity duration-1000">
                                                {item.secondaryValue || '0'}
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
};

export default UnifiedLeaderboard;
