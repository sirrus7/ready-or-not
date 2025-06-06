// src/components/Game/KpiDisplay.tsx
import React from 'react';
import {TeamRoundData} from '@shared/types';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Building,
    ShoppingCartIcon,
    DollarSign,
    PercentIcon,
} from 'lucide-react'; // Added Hourglass

interface KpiDisplayProps {
    teamName: string | null;
    currentRoundLabel: string;
    kpis: TeamRoundData | null;
}

// Base starting values for the game
const BASE_CAPACITY = 5000;
const BASE_ORDERS = 6250;
const BASE_COST = 1200000;
const BASE_ASP = 1000;

const formatCurrency = (value: number | undefined | null, defaultValue: number | string = 'N/A'): string => {
    if (value === undefined || value === null || isNaN(value)) return String(defaultValue);
    if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000 && Math.abs(value) < 1_000_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
};

const formatNumber = (value: number | undefined | null, defaultValue: number | string = 'N/A'): string => {
    if (value === undefined || value === null || isNaN(value)) return String(defaultValue);
    return value.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
};

interface KpiItemProps {
    label: string;
    currentValue: number | undefined | null;
    startValue: number | undefined | null;
    baseStartValue: number;
    isCurrency?: boolean;
    isPercentage?: boolean;
    icon: React.ReactNode;
    colorClass: string;
    trendHigherIsBetter?: boolean;
}

const KpiItem: React.FC<KpiItemProps> = ({
                                             label,
                                             currentValue,
                                             startValue,
                                             baseStartValue,
                                             isCurrency,
                                             isPercentage,
                                             icon,
                                             colorClass,
                                             trendHigherIsBetter = true
                                         }) => {
    const displayCurrent = isCurrency
        ? formatCurrency(currentValue, formatCurrency(startValue ?? baseStartValue, 'N/A')) // Provide default for nested formatCurrency
        : (isPercentage ? `${((currentValue ?? (startValue ?? baseStartValue)) * 100).toFixed(0)}%`
            : formatNumber(currentValue, formatNumber(startValue ?? baseStartValue, 'N/A'))); // Provide default

    const comparisonStartValue = startValue ?? baseStartValue;

    let trendIcon = null;
    let trendColor = 'text-gray-400';

    if (currentValue !== undefined && currentValue !== null &&
        comparisonStartValue !== undefined && comparisonStartValue !== null &&
        !isNaN(currentValue) && !isNaN(comparisonStartValue)) {
        if (currentValue > comparisonStartValue) {
            trendIcon = <TrendingUp size={14} className="ml-1"/>;
            trendColor = trendHigherIsBetter ? 'text-green-400' : 'text-red-400';
        } else if (currentValue < comparisonStartValue) {
            trendIcon = <TrendingDown size={14} className="ml-1"/>;
            trendColor = trendHigherIsBetter ? 'text-red-400' : 'text-green-400';
        } else {
            trendIcon = <Minus size={14} className="ml-1"/>;
        }
    }

    return (
        <div
            className={`p-3 md:p-4 rounded-lg bg-gray-700/60 shadow-md border border-gray-600/50 flex flex-col justify-between min-h-[90px]`}>
            <div className="flex justify-between items-baseline mb-1">
                <span className={`text-xs sm:text-sm font-medium ${colorClass} opacity-90 flex items-center`}>
                    {icon} <span className="ml-1.5">{label}</span>
                </span>
                {currentValue !== null && currentValue !== undefined && !isNaN(currentValue) && (startValue !== null && !isNaN(startValue)) && currentValue !== startValue && (
                    <span className={`text-xs ${trendColor} flex items-center opacity-80`}>
                        {trendIcon}
                    </span>
                )}
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${colorClass}`}>{displayCurrent}</p>
            <p className="text-2xs sm:text-xs text-gray-400 mt-0.5 opacity-70">
                Start: {isCurrency ? formatCurrency(startValue, formatCurrency(baseStartValue, 'N/A')) : formatNumber(startValue, formatNumber(baseStartValue, 'N/A'))}
            </p>
        </div>
    );
};


const KpiDisplay: React.FC<KpiDisplayProps> = ({teamName, currentRoundLabel, kpis}) => {
    const roundNumber = kpis?.round_number || 0;

    const displayKpis = {
        capacity: kpis?.current_capacity ?? kpis?.start_capacity ?? (roundNumber > 0 ? null : BASE_CAPACITY),
        orders: kpis?.current_orders ?? kpis?.start_orders ?? (roundNumber > 0 ? null : BASE_ORDERS),
        cost: kpis?.current_cost ?? kpis?.start_cost ?? (roundNumber > 0 ? null : BASE_COST),
        asp: kpis?.current_asp ?? kpis?.start_asp ?? (roundNumber > 0 ? null : BASE_ASP),
    };
    const startKpis = {
        capacity: kpis?.start_capacity ?? (roundNumber > 0 ? null : BASE_CAPACITY),
        orders: kpis?.start_orders ?? (roundNumber > 0 ? null : BASE_ORDERS),
        cost: kpis?.start_cost ?? (roundNumber > 0 ? null : BASE_COST),
        asp: kpis?.start_asp ?? (roundNumber > 0 ? null : BASE_ASP),
    };

    // If kpis is null AND it's a round > 0, it means data is expected but not yet loaded/available.
    // The TeamDisplayPage will show a general "Loading data for {phase}"
    // KpiDisplay itself can just show N/A or base values.
    // The specific "Loading KPI data..." spinner inside KpiDisplay is removed.

    return (
        <div
            className="p-3 md:p-4 bg-gray-800/80 backdrop-blur-sm text-white rounded-t-xl shadow-lg border-b border-gray-700">
            <h2 className="text-lg md:text-xl font-bold text-center text-sky-300 mb-0.5">
                Team: <span className="text-white">{teamName || 'N/A'}</span>
            </h2>
            <p className="text-xs text-gray-400 text-center mb-3 font-medium">{currentRoundLabel}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                <KpiItem
                    label="Capacity"
                    currentValue={displayKpis.capacity}
                    startValue={startKpis.capacity}
                    baseStartValue={BASE_CAPACITY}
                    icon={<Building size={14}/>}
                    colorClass="text-blue-400"
                />
                <KpiItem
                    label="Orders"
                    currentValue={displayKpis.orders}
                    startValue={startKpis.orders}
                    baseStartValue={BASE_ORDERS}
                    icon={<ShoppingCartIcon size={14}/>}
                    colorClass="text-yellow-400"
                />
                <KpiItem
                    label="Cost"
                    currentValue={displayKpis.cost}
                    startValue={startKpis.cost}
                    baseStartValue={BASE_COST}
                    isCurrency
                    icon={<DollarSign size={14}/>}
                    colorClass="text-red-400"
                    trendHigherIsBetter={false}
                />
                <KpiItem
                    label="ASP"
                    currentValue={displayKpis.asp}
                    startValue={startKpis.asp}
                    baseStartValue={BASE_ASP}
                    isCurrency
                    icon={<PercentIcon size={14}/>}
                    colorClass="text-green-400"
                />
            </div>
        </div>
    );
};
export default KpiDisplay;