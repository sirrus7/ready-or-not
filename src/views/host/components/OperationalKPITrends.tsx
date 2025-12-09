// src/views/host/components/OperationalKPITrends.tsx
// Line charts showing the 4 core operational KPIs that teams directly manage
import React, {useMemo} from 'react';
import {LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import {Team, TeamRoundData} from '@shared/types';
import {ShoppingCart, DollarSign, Target, Building, TrendingUp} from 'lucide-react';

interface OperationalKPITrendsProps {
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

const OperationalKPITrends: React.FC<OperationalKPITrendsProps> = ({teams, teamRoundData}) => {
    // Transform data for the 4 core operational KPIs
    const operationalTrendData = useMemo(() => {
        if (!teams.length || !Object.keys(teamRoundData).length) return null;

        // Create data points for each round (1, 2, 3)
        const rounds = [1, 2, 3];

        const capacityData: TrendDataPoint[] = [];
        const ordersData: TrendDataPoint[] = [];
        const costData: TrendDataPoint[] = [];
        const aspData: TrendDataPoint[] = [];

        rounds.forEach(roundNum => {
            const capacityPoint: TrendDataPoint = {round: `Round ${roundNum}`};
            const ordersPoint: TrendDataPoint = {round: `Round ${roundNum}`};
            const costPoint: TrendDataPoint = {round: `Round ${roundNum}`};
            const aspPoint: TrendDataPoint = {round: `Round ${roundNum}`};

            teams.forEach(team => {
                const roundData = teamRoundData[team.id]?.[roundNum];
                if (roundData) {
                    capacityPoint[team.name] = roundData.current_capacity;
                    ordersPoint[team.name] = roundData.current_orders;
                    costPoint[team.name] = roundData.current_cost;
                    aspPoint[team.name] = roundData.current_asp;
                } else {
                    // Handle missing data gracefully
                    capacityPoint[team.name] = 0;
                    ordersPoint[team.name] = 0;
                    costPoint[team.name] = 0;
                    aspPoint[team.name] = 0;
                }
            });

            capacityData.push(capacityPoint);
            ordersData.push(ordersPoint);
            costData.push(costPoint);
            aspData.push(aspPoint);
        });

        return {
            capacity: capacityData,
            orders: ordersData,
            cost: costData,
            asp: aspData
        };
    }, [teams, teamRoundData]);

    // Custom tooltip formatter for different KPI types
    const formatTooltipValue = (value: number, name: string, dataKey: string) => {
        if (dataKey === 'cost') {
            return [`$${value.toLocaleString()}`, name];
        }
        if (dataKey === 'asp') {
            return [`$${value.toLocaleString()}`, name];
        }
        // capacity and orders - just numbers
        return [value.toLocaleString(), name];
    };

    // Individual chart component for operational KPIs
    const OperationalChart: React.FC<{
        title: string;
        data: TrendDataPoint[];
        icon: React.ReactNode;
        color: string;
        dataKey: string;
        yAxisFormatter?: (value: number) => string;
    }> = ({title, data, icon, color, dataKey, yAxisFormatter}) => (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg text-white ${color}`}>
                    {icon}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
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
                            wrapperStyle={{ zIndex: 1 }}
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

    if (!operationalTrendData) {
        return (
            <div className="text-center py-12">
                <Target size={48} className="text-gray-400 mx-auto mb-4"/>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Operational Data Available</h3>
                <p className="text-gray-500">KPI trends will be displayed here once teams complete multiple rounds.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Operational KPI Trends</h2>
                <p className="text-gray-600">How teams managed their core business metrics throughout the game</p>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Production Capacity */}
                <OperationalChart
                    title="Capacity"
                    data={operationalTrendData.capacity}
                    icon={<Building size={24}/>}
                    color="bg-gradient-to-r from-blue-500 to-blue-600"
                    dataKey="capacity"
                    yAxisFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
                />

                {/* Market Orders */}
                <OperationalChart
                    title="Orders"
                    data={operationalTrendData.orders}
                    icon={<ShoppingCart size={24}/>}
                    color="bg-gradient-to-r from-yellow-500 to-yellow-600"
                    dataKey="orders"
                    yAxisFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
                />

                {/* Operational Costs */}
                <OperationalChart
                    title="Costs"
                    data={operationalTrendData.cost}
                    icon={<DollarSign size={24}/>}
                    color="bg-gradient-to-r from-green-500 to-green-600"
                    dataKey="cost"
                    yAxisFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />

                {/* Average Selling Price */}
                <OperationalChart
                    title="Average Selling Price"
                    data={operationalTrendData.asp}
                    icon={<TrendingUp size={24}/>}
                    color="bg-gradient-to-r from-red-500 to-red-600"
                    dataKey="asp"
                    yAxisFormatter={(value) => `$${value.toLocaleString()}`}
                />
            </div>

            {/* Strategic Insights */}
            <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
                <h3 className="text-lg font-semibold text-indigo-900 mb-3">🎯 Strategic Decision Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-800">
                    <div>
                        <strong>Capacity Growth:</strong> Shows investment focus - teams prioritizing scale vs
                        efficiency
                    </div>
                    <div>
                        <strong>Orders Pattern:</strong> Reveals market response to challenges and competitive decisions
                    </div>
                    <div>
                        <strong>Cost Management:</strong> Indicates operational discipline vs growth spending strategies
                    </div>
                    <div>
                        <strong>Pricing Evolution:</strong> Shows competitive positioning and value strategy over time
                    </div>
                </div>

                <div className="mt-4 p-4 bg-indigo-100 rounded-lg">
                    <p className="text-sm text-indigo-700">
                        <strong>💡 Teaching Moment:</strong> Look for teams where capacity exceeds orders
                        (over-investment)
                        vs orders exceeding capacity (missed opportunities). The most successful teams typically
                        maintain
                        balanced growth across all metrics.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OperationalKPITrends;
