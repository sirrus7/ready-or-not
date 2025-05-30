// src/pages/DashboardPage/components/DashboardHeader.tsx - Header component
import React from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { User } from '../../../types';

interface DashboardHeaderProps {
    user: User | null;
    isLoadingGames: boolean;
    onRefresh: () => void;
    onLogout: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
                                                             user,
                                                             isLoadingGames,
                                                             onRefresh,
                                                             onLogout
                                                         }) => {
    const capitalizeName = (str: string): string => {
        return str
            .split(/[.\-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    return (
        <header className="max-w-6xl mx-auto mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">Teacher Dashboard</h1>
                <p className="text-gray-600 text-sm md:text-base">
                    Welcome, {user?.email ? capitalizeName(user.email.split('@')[0]) : 'Teacher'}!
                </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 mt-3 sm:mt-0">
                <button
                    onClick={onRefresh}
                    disabled={isLoadingGames}
                    className="flex items-center gap-1.5 text-xs sm:text-sm text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-lg font-medium transition-colors border border-blue-200 disabled:opacity-70"
                    title="Refresh game lists"
                >
                    <RefreshCw size={14} className={isLoadingGames ? 'animate-spin' : ''}/> Refresh
                </button>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 text-xs sm:text-sm text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 px-3 py-2 rounded-lg font-medium transition-colors border border-red-200"
                >
                    <LogOut size={14}/> Logout
                </button>
            </div>
        </header>
    );
};

export default DashboardHeader;
