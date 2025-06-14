// src/views/host/components/BusinessGrowthStrategyNotifications.tsx
// Add this component to your host interface

import React, {useState, useEffect} from 'react';
import {useGameContext} from '@app/providers/GameProvider';
import {useSupabaseQuery} from '@shared/hooks/supabase';
import {supabase} from '@shared/services/supabase';
import {Bell, CheckCircle, Clock, FileText, X, AlertTriangle} from 'lucide-react';

interface PendingReport {
    id: string;
    team_id: string;
    team_name: string;
    investment_name: string;
    cost: number;
    submitted_at: string;
    report_given: boolean;
}

const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

const BusinessGrowthStrategyNotifications: React.FC = () => {
    const {state} = useGameContext();
    const [showNotifications, setShowNotifications] = useState(false);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [realtimeNotifications, setRealtimeNotifications] = useState<any[]>([]);

    // Fetch pending reports from database
    const {
        data: pendingReports = [],
        refresh: refreshReports,
        isLoading
    } = useSupabaseQuery(
        async () => {
            if (!state.currentSessionId || state.currentSessionId === 'new') {
                return [];
            }

            const {data, error} = await supabase
                .from('team_decisions')
                .select(`
                    id,
                    team_id,
                    total_spent_budget,
                    submitted_at,
                    report_given,
                    immediate_purchase_data,
                    teams!inner(name)
                `)
                .eq('session_id', state.currentSessionId)
                .eq('is_immediate_purchase', true)
                .eq('immediate_purchase_type', 'business_growth_strategy')
                .order('submitted_at', {ascending: false});

            if (error) throw error;

            return (data || []).map(item => ({
                id: item.id,
                team_id: item.team_id,
                team_name: item.teams?.name || 'Unknown Team',
                investment_name: 'Business Growth Strategy',
                cost: item.total_spent_budget || 0,
                submitted_at: item.submitted_at,
                report_given: item.report_given || false
            }));
        },
        [state.currentSessionId],
        {
            cacheKey: `pending-reports-${state.currentSessionId}`,
            cacheTimeout: 10000,
            enabled: !!(state.currentSessionId && state.currentSessionId !== 'new')
        }
    );

    // Listen for realtime notifications
    useEffect(() => {
        if (!state.currentSessionId) return;

        const channel = supabase.channel('host-notifications')
            .on('broadcast', {event: 'immediate_purchase'}, (payload) => {
                console.log('Received immediate purchase notification:', payload);

                // Add to realtime notifications (for instant alerts)
                setRealtimeNotifications(prev => [payload.payload, ...prev]);

                // Refresh database data
                refreshReports();

                // Auto-remove realtime notification after 10 seconds
                setTimeout(() => {
                    setRealtimeNotifications(prev =>
                        prev.filter(n => n.timestamp !== payload.payload.timestamp)
                    );
                }, 10000);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [state.currentSessionId, refreshReports]);

    const markReportAsGiven = async (decisionId: string) => {
        setIsUpdating(decisionId);
        try {
            const {error} = await supabase
                .from('team_decisions')
                .update({
                    report_given: true,
                    report_given_at: new Date().toISOString()
                })
                .eq('id', decisionId);

            if (error) throw error;
            await refreshReports();
        } catch (error) {
            console.error('Failed to mark report as given:', error);
        } finally {
            setIsUpdating(null);
        }
    };

    const pendingCount = pendingReports.filter(report => !report.report_given).length;
    const totalNotifications = pendingCount + realtimeNotifications.length;

    if (!state.currentSessionId || state.currentSessionId === 'new') {
        return null;
    }

    return (
        <div className="relative">
            {/* Notification Bell */}
            <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors disabled:opacity-50"
                title="Business Growth Strategy Reports"
                disabled={isLoading}
            >
                <Bell size={20}/>
                {totalNotifications > 0 && (
                    <span
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {totalNotifications}
                    </span>
                )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
                <div
                    className="absolute top-12 right-0 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-800 flex items-center justify-between">
                            <div className="flex items-center">
                                <FileText className="mr-2 text-yellow-600" size={20}/>
                                Strategy Report Requests
                            </div>
                            {isLoading && (
                                <div
                                    className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-yellow-600"></div>
                            )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Teams waiting for Business Growth Strategy reports
                        </p>
                    </div>

                    <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
                        {/* Realtime Notifications (recent alerts) */}
                        {realtimeNotifications.map((notification, index) => (
                            <div key={`realtime-${index}`} className="p-4 bg-yellow-100 border-l-4 border-yellow-500">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <AlertTriangle className="text-yellow-600 mr-2" size={20}/>
                                        <div>
                                            <p className="font-semibold text-yellow-800">
                                                {notification.team_name} just purchased!
                                            </p>
                                            <p className="text-sm text-yellow-700">
                                                {notification.investment_name} - {formatCurrency(notification.cost)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-yellow-600 font-medium">
                                        Just now
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Persistent Reports */}
                        {pendingReports.length === 0 && realtimeNotifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <FileText className="mx-auto mb-2" size={24}/>
                                <p className="font-medium">No strategy requests yet</p>
                                <p className="text-sm mt-1">Teams haven't purchased Business Growth Strategy</p>
                            </div>
                        ) : (
                            pendingReports.map((report) => {
                                const isUpdatingThis = isUpdating === report.id;

                                return (
                                    <div
                                        key={report.id}
                                        className={`p-4 ${
                                            report.report_given ? 'bg-gray-50' : 'bg-blue-50'
                                        } ${isUpdatingThis ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center mb-2">
                                                    <span className="font-medium text-gray-800">
                                                        {report.team_name}
                                                    </span>
                                                    {!report.report_given ? (
                                                        <span
                                                            className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            <Clock className="mr-1" size={12}/>
                                                            Report Needed
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            <CheckCircle className="mr-1" size={12}/>
                                                            Report Given
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-sm text-gray-600 mb-2">
                                                    Investment: <strong>{formatCurrency(report.cost)}</strong>
                                                </p>

                                                <div className="text-xs text-gray-500 mb-3">
                                                    Purchased: {new Date(report.submitted_at).toLocaleString()}
                                                </div>

                                                {!report.report_given && (
                                                    <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg">
                                                        <div className="flex items-start">
                                                            <FileText className="text-blue-600 mr-2 mt-0.5" size={16}/>
                                                            <div className="text-sm">
                                                                <p className="text-blue-800 font-medium mb-1">
                                                                    Give this team their report:
                                                                </p>
                                                                <p className="text-blue-700">
                                                                    Business Growth Strategy Report with insider
                                                                    information about Round 1 investment options.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="ml-4 flex flex-col gap-2">
                                                {!report.report_given && (
                                                    <button
                                                        onClick={() => markReportAsGiven(report.id)}
                                                        disabled={isUpdatingThis}
                                                        className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors disabled:opacity-50"
                                                        title="Mark as report given"
                                                    >
                                                        {isUpdatingThis ? (
                                                            <div
                                                                className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                                                        ) : (
                                                            'Report Given'
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {pendingCount > 0 && (
                        <div className="p-3 bg-yellow-50 border-t border-yellow-200">
                            <div className="flex items-center justify-center text-sm text-yellow-800">
                                <Clock className="mr-2" size={16}/>
                                <span className="font-medium">
                                    {pendingCount} team{pendingCount !== 1 ? 's' : ''} waiting for reports
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BusinessGrowthStrategyNotifications;
