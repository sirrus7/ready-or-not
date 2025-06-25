// src/views/host/components/KPITrendCharts.tsx
// Line charts showing KPI progression across all 3 rounds
import React, {useMemo} from 'react';
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import {Team, TeamRoundData} from '@shared/types';
import {calculateKpiValue} from '@shared/components/UI/Leaderboard/utils';
import {TrendingUp, DollarSign, BarChart2, Zap} from 'lucide-react';

interface KPITrendChartsProps {
    teams: Team[];
    teamRoundData: Record<string, Record<number, TeamRoundData>>;
}

// Color palette for team lines (supports up to 8 teams)
const TEAM_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16', // Lime
];

interface TrendDataPoint {
    round: string;

    [teamName: string]: string | number;
}

const KPITrendCharts: React.FC<KPITrendChartsProps> = ({teams, teamRoundData}) => {
    // Transform data for trend analysis
    const trendData = useMemo(() => {
        if (!teams.length || !Object.keys(teamRoundData).length) return null;

        // Create data points for each round (1, 2, 3)
        const rounds = [1, 2, 3];

        const netIncomeData: TrendDataPoint[] = [];
        const revenueData: TrendDataPoint[] = [];
        const netMarginData: TrendDataPoint[] = [];
        const capacityData: TrendDataPoint[] = [];

        rounds.forEach(roundNum => {
            const netIncomePoint: TrendDataPoint = {round: `Round ${roundNum}`};
            const revenuePoint: TrendDataPoint = {round: `Round ${roundNum}`};
            const netMarginPoint: TrendDataPoint = {round: `Round ${roundNum}`};
            const capacityPoint: TrendDataPoint = {round: `Round ${roundNum}`};

            teams.forEach(team => {
                const roundData = teamRoundData[team.id]?.[roundNum];
                if (roundData) {
                    netIncomePoint[team.name] = calculateKpiValue(roundData, 'net_income');
                    revenuePoint[team.name] = calculateKpiValue(roundData, 'revenue');
                    netMarginPoint[team.name] = calculateKpiValue(roundData, 'net_margin');
                    capacityPoint[team.name] = calculateKpiValue(roundData, 'capacity');
                } else {
                    // Handle missing data gracefully
                    netIncomePoint[team.name] = 0;
                    revenuePoint[team.name] = 0;
                    netMarginPoint[team.name] = 0;
                    capacityPoint[team.name] = 0;
                }
            });

            netIncomeData.push(netIncomePoint);
            revenueData.push(revenuePoint);
            netMarginData.push(netMarginPoint);
            capacityData.push(capacityPoint);
        });

        return {
            netIncome: netIncomeData,
            revenue: revenueData,
            netMargin: netMarginData,
            capacity: capacityData
        };
    }, [teams, teamRoundData]);

    // Custom tooltip formatter
    const formatTooltipValue = (value: number, name: string, dataKey: string) => {
        if (dataKey === 'netMargin') {
            return [`${(value * 100).toFixed(1)}%`, name];
        }
        if (dataKey === 'netIncome' || dataKey === 'revenue') {
            return [`$${value.toLocaleString()}`, name];
        }
        return [value.toLocaleString(), name];
    };

    // Individual chart component
    const TrendChart: React.FC<{
        title: string;
        data: TrendDataPoint[];
        icon: React.ReactNode;
        color: string;
        dataKey: string;
        yAxisFormatter?: (value: number) => string;
    }> = ({title, data, icon, color, dataKey, yAxisFormatter}) => (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg text-white ${color}`}>
                    {icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{top: 20, right: 30, left: 20, bottom: 20}}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30"/>
                        <XAxis
                            dataKey="round"
                            className="text-sm"
                            tick={{fontSize: 12}}
                        />
                        <YAxis
                            className="text-sm"
                            tick={{fontSize: 12}}
                            tickFormatter={yAxisFormatter}
                        />
                        <Tooltip
                            formatter={(value: number, name: string) => formatTooltipValue(value, name, dataKey)}
                            labelClassName="font-medium"
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        />
                        <Legend
                            wrapperStyle={{paddingTop: '20px'}}
                            iconType="line"
                        />
                        {teams.map((team, index) => (
                            <Line
                                key={team.id}
                                type="monotone"
                                dataKey={team.name}
                                stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                                strokeWidth={3}
                                dot={{r: 6, strokeWidth: 2}}
                                activeDot={{r: 8, strokeWidth: 2}}
                                connectNulls={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    if (!trendData) {
        return (
            <div className="text-center py-12">
                <TrendingUp size={48} className="text-gray-400 mx-auto mb-4"/>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Trend Data Available</h3>
                <p className="text-gray-500">KPI progression will be displayed here once teams complete multiple
                    rounds.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">KPI Performance Trends</h2>
                <p className="text-gray-600">How each team's performance evolved across all three rounds</p>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Net Income Trend */}
                <TrendChart
                    title="Net Income Progression"
                    data={trendData.netIncome}
                    icon={<DollarSign size={24}/>}
                    color="bg-gradient-to-r from-yellow-500 to-yellow-600"
                    dataKey="netIncome"
                    yAxisFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />

                {/* Revenue Trend */}
                <TrendChart
                    title="Revenue Growth"
                    data={trendData.revenue}
                    icon={<TrendingUp size={24}/>}
                    color="bg-gradient-to-r from-orange-500 to-orange-600"
                    dataKey="revenue"
                    yAxisFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />

                {/* Net Margin Trend */}
                <TrendChart
                    title="Net Margin Evolution"
                    data={trendData.netMargin}
                    icon={<BarChart2 size={24}/>}
                    color="bg-gradient-to-r from-purple-500 to-purple-600"
                    dataKey="netMargin"
                    yAxisFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                />

                {/* Capacity Trend */}
                <TrendChart
                    title="Production Capacity"
                    data={trendData.capacity}
                    icon={<Zap size={24}/>}
                    color="bg-gradient-to-r from-blue-500 to-blue-600"
                    dataKey="capacity"
                    yAxisFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
                />
            </div>

            {/* Insights */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">📊 Reading the Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                    <div>
                        <strong>Steep upward lines</strong> indicate teams that made highly effective strategic
                        decisions
                    </div>
                    <div>
                        <strong>Consistent growth</strong> shows teams with balanced, sustainable strategies
                    </div>
                    <div>
                        <strong>Volatile patterns</strong> suggest high-risk strategies or reactive decision-making
                    </div>
                    <div>
                        <strong>Declining trends</strong> may indicate poor investment choices or challenge responses
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KPITrendCharts;
