// src/pages/DashboardPage/index.tsx - Main orchestration component
import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardActions } from './hooks/useDashboardActions';
import DashboardHeader from './components/DashboardHeader';
import GameLists from './components/GameLists';
import NotificationBanner from './components/NotificationBanner';
import DeleteConfirmModal from './components/DeleteConfirmModal';

const DashboardPage: React.FC = () => {
    const { user, loading: authLoading } = useAuth();

    // Data management
    const {
        games,
        isLoadingGames,
        gamesError,
        refetchGames
    } = useDashboardData(user?.id);

    // Action handlers
    const {
        notification,
        isDeleteModalOpen,
        gameToDelete,
        isDeleting,
        deleteError,
        handleGameSelect,
        handleOpenDeleteModal,
        handleConfirmDelete,
        handleLogout,
        dismissNotification,
        closeDeleteModal
    } = useDashboardActions(games, refetchGames);

    // Loading state
    if (authLoading && !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading Dashboard...</p>
            </div>
        );
    }

    // Split games into current and completed
    const currentGames = games.filter(session => !session.is_complete);
    const completedGames = games.filter(session => session.is_complete);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 md:p-8">
            <DashboardHeader
                user={user}
                isLoadingGames={isLoadingGames}
                onRefresh={refetchGames}
                onLogout={handleLogout}
            />

            <NotificationBanner
                notification={notification || (gamesError ? { type: 'error', message: gamesError } : null) || (deleteError ? { type: 'error', message: deleteError } : null)}
                onDismiss={dismissNotification}
            />

            <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Create New Game Card */}
                <div className="md:col-span-1 bg-blue-600 text-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow flex flex-col items-center justify-center text-center order-first md:order-none">
                    <PlusCircle size={40} className="mb-2 opacity-80"/>
                    <h2 className="text-xl lg:text-2xl font-bold mb-1.5">Start a New Game</h2>
                    <p className="text-xs lg:text-sm opacity-90 mb-5">
                        Set up a new "Ready or Not" simulation for your class.
                    </p>
                    <Link
                        to="/create-game"
                        className="bg-white text-blue-700 font-semibold py-2.5 px-6 lg:py-3 lg:px-8 rounded-lg hover:bg-blue-50 transition-colors shadow-md text-sm lg:text-base"
                    >
                        Create Game
                    </Link>
                </div>

                {/* Game Lists */}
                <GameLists
                    currentGames={currentGames}
                    completedGames={completedGames}
                    isLoading={isLoadingGames}
                    onGameSelect={handleGameSelect}
                    onGameDelete={handleOpenDeleteModal}
                />
            </main>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                gameToDelete={gameToDelete}
                isDeleting={isDeleting}
                onConfirm={handleConfirmDelete}
                onClose={closeDeleteModal}
            />
        </div>
    );
};

export default DashboardPage;
