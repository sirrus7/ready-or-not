// src/views/team/components/GameStatus/KpiMobileNotifications.tsx
import React, {useEffect, useState} from 'react';
import {Building, ShoppingCart, DollarSign, TrendingUp} from 'lucide-react';

interface KpiNotification {
    id: string;
    kpi: 'capacity' | 'orders' | 'cost' | 'asp';
    change: number;
    color: 'green' | 'red' | 'blue' | 'yellow';
    timestamp: number;
}

interface KpiNotificationsProps  {
    notifications: KpiNotification[];
}

const KpiNotifications: React.FC<KpiNotificationsProps > = ({notifications}) => {
    const [activeNotification, setActiveNotification] = useState<KpiNotification | null>(null);
    const [queue, setQueue] = useState<KpiNotification[]>([]);

    useEffect(() => {
        if (notifications.length > 0) {
            // Add new notifications to queue
            setQueue(prev => [...prev, ...notifications]);

            // Vibrate on mobile (if supported)
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        }
    }, [notifications]);

    // Process queue - show one notification at a time
    useEffect(() => {
        if (!activeNotification && queue.length > 0) {
            const [next, ...remaining] = queue;
            setActiveNotification(next);
            setQueue(remaining);

            // Clear after 2 seconds (shorter for mobile)
            setTimeout(() => {
                setActiveNotification(null);
            }, 2000);
        }
    }, [activeNotification, queue]);

    const getKpiIcon = (kpi: string) => {
        switch (kpi) {
            case 'capacity': return <Building size={20} className="text-white"/>;
            case 'orders': return <ShoppingCart size={20} className="text-white"/>;
            case 'cost': return <DollarSign size={20} className="text-white"/>;
            case 'asp': return <TrendingUp size={20} className="text-white"/>;
            default: return null;
        }
    };

    const formatKpiChange = (kpi: string, change: number): string => {
        const sign = change >= 0 ? '+' : '';
        if (kpi === 'cost' || kpi === 'asp') {
            return `${sign}$${Math.abs(change).toLocaleString()}`;
        }
        return `${sign}${change.toLocaleString()}`;
    };

    const getBubbleStyle = (color: string) => {
        switch (color) {
            case 'green': return 'bg-green-500 border-green-400 shadow-green-500/50';
            case 'red': return 'bg-red-500 border-red-400 shadow-red-500/50';
            case 'blue': return 'bg-blue-500 border-blue-400 shadow-blue-500/50';
            case 'yellow': return 'bg-yellow-500 border-yellow-400 shadow-yellow-500/50';
            default: return 'bg-gray-500 border-gray-400 shadow-gray-500/50';
        }
    };

    if (!activeNotification) {
        return null;
    }

    return (
        <>
            {/* Mobile-friendly toast notification - bottom center */}
            <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-4">
                <div
                    className={`
                        flex items-center gap-3 px-6 py-4 rounded-2xl border-2 shadow-2xl text-white
                        ${getBubbleStyle(activeNotification.color)}
                        animate-in slide-in-from-bottom duration-300 ease-out
                        min-w-[280px] justify-center
                    `}
                >
                    {getKpiIcon(activeNotification.kpi)}
                    <span className="font-bold text-lg uppercase tracking-wide">
                        {activeNotification.kpi}
                    </span>
                    <span className="font-bold text-xl">
                        {formatKpiChange(activeNotification.kpi, activeNotification.change)}
                    </span>
                </div>
            </div>

            {/* Queue indicator - show if more notifications waiting */}
            {queue.length > 0 && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
                    <div className="bg-slate-700 text-white px-3 py-1 rounded-full text-xs font-medium">
                        +{queue.length} more
                    </div>
                </div>
            )}
        </>
    );
};

export default KpiNotifications;