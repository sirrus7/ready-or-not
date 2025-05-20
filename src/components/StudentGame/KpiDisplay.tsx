// src/components/StudentGame/KpiDisplay.tsx
import React from 'react';
import {TeamRoundData} from '../../types';
import {TrendingUp, TrendingDown, Minus} from 'lucide-react';

interface KpiDisplayProps {
    teamName: string | null;
    currentRoundLabel: string; // e.g., "RD-1", "RD-2 KPIs"
    kpis: TeamRoundData | null; // Current KPIs for the team in this round
}

const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString();
};

interface KpiItemProps {
    label: string;
    currentValue: number | undefined;
    startValue: number | undefined;
    isCurrency?: boolean;
    isPercentage?: boolean;
    colorClass: string; // e.g., 'text-blue-500', 'text-yellow-500'
}

const KpiItem: React.FC<KpiItemProps> = ({label, currentValue, startValue, isCurrency, isPercentage, colorClass}) => {
    const displayCurrent = isCurrency ? formatCurrency(currentValue) : (isPercentage ? `${(currentValue || 0) * 100}%` : formatNumber(currentValue));
    const displayStart = isCurrency ? formatCurrency(startValue) : (isPercentage ? `${(startValue || 0) * 100}%` : formatNumber(startValue));

    let trendIcon = null;
    let trendColor = 'text-gray-500';

    if (currentValue !== undefined && startValue !== undefined) {
        if (currentValue > startValue) {
            trendIcon = <TrendingUp size={14} className="ml-1"/>;
            trendColor = 'text-green-500';
        } else if (currentValue < startValue) {
            trendIcon = <TrendingDown size={14} className="ml-1"/>;
            trendColor = 'text-red-500';
        } else {
            trendIcon = <Minus size={14} className="ml-1"/>;
        }
    }
    // Specific logic for 'Cost' where lower is better
    if (label.toLowerCase() === 'cost' && currentValue !== undefined && startValue !== undefined) {
        if (currentValue < startValue) trendColor = 'text-green-500'; // Good
        else if (currentValue > startValue) trendColor = 'text-red-500'; // Bad
    }


    return (
        <div className={`p-3 md:p-4 rounded-lg bg-gray-700/50 shadow`}>
            <div className="flex justify-between items-baseline">
                <span className={`text-sm font-medium ${colorClass} opacity-80`}>{label}</span>
                <span className={`text-xs ${trendColor} flex items-center`}>
           {displayStart} {currentValue !== startValue ? trendIcon : null}
        </span>
            </div>
            <p className={`text-2xl md:text-3xl font-bold ${colorClass} mt-1`}>{displayCurrent}</p>
            <p className="text-xs text-gray-400 mt-0.5">Start: {displayStart} | Current: {displayCurrent}</p>
        </div>
    );
};


const KpiDisplay: React.FC<KpiDisplayProps> = ({teamName, currentRoundLabel, kpis}) => {
    if (!kpis) {
        return (
            <div className="p-6 bg-gray-800 text-gray-400 text-center rounded-t-xl">
                Loading KPI data...
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-gray-800 text-white rounded-t-xl shadow-lg">
            <h2 className="text-xl md:text-2xl font-bold text-center text-blue-300 mb-1">
                Team {teamName || 'N/A'}: <span className="text-white">{currentRoundLabel}</span>
            </h2>
            <p className="text-xs text-gray-400 text-center mb-4">Key Performance Indicators</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                <KpiItem
                    label="Capacity"
                    currentValue={kpis.current_capacity}
                    startValue={kpis.start_capacity}
                    colorClass="text-blue-400"
                />
                <KpiItem
                    label="Orders"
                    currentValue={kpis.current_orders}
                    startValue={kpis.start_orders}
                    colorClass="text-yellow-400"
                />
                <KpiItem
                    label="Cost"
                    currentValue={kpis.current_cost}
                    startValue={kpis.start_cost}
                    isCurrency
                    colorClass="text-green-400"
                />
                <KpiItem
                    label="ASP"
                    currentValue={kpis.current_asp}
                    startValue={kpis.start_asp}
                    isCurrency
                    colorClass="text-purple-400"
                />
            </div>
        </div>
    );
};

export default KpiDisplay;