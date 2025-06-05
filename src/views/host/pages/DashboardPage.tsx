// src/views/host/pages/DashboardPage.tsx - Enhanced with lifecycle management
import React from 'react';
import {Link} from 'react-router-dom';
import {PlusCircle} from 'lucide-react';
import {useAuth} from '@app/providers/AuthProvider';
import {useDashboardData} from '@views/host/hooks/useDashboardData';
import {useDashboardActions} from '@views/host/hooks/useDashboardActions';
import DashboardHeader from '@views/host/components/Dashboard/DashboardHeader';
import DraftGamesList from '@views/host/components/Dashboard/DraftGamesList';
import GameLists from '@views/host/components/Dashboard/GameLists';
import NotificationBanner from '@views/host/components/Dashboard/NotificationBanner';
import DeleteConfirmModal from '@views/host/components/Dashboard/DeleteConfirmModal';

const DashboardPage: React.FC = () => {
    const {user, loading: authLoading} = useAuth();

    // Enhanced data management with lifecycle support
    const {
        games,
        isLoadingGames,
        gamesError,
        refetchGames
    } = useDashboardData(user?.id);

    // Enhanced action handlers with draft management
    const {
        notification,
        isDeleteModalOpen,
        gameToDelete,
        isDeleting,
        deleteError,
        handleGameSelect,
        handleResumeDraft,
        handleOpenDeleteModal,
        handleConfirmDelete,
        handleLogout,
        dismissNotification,
        closeDeleteModal
    } = useDashboardActions(games, refetchGames);

    // Loading state
    if (authLoading && !user) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 md:p-8">
            <DashboardHeader
                user={user}
                isLoadingGames={isLoadingGames}
                onRefresh={refetchGames}
                onLogout={handleLogout}
            />

            <NotificationBanner
                notification={notification || (gamesError ? {
                    type: 'error',
                    message: gamesError
                } : null) || (deleteError ? {type: 'error', message: deleteError} : null)}
                onDismiss={dismissNotification}
            />

            <main className="max-w-6xl mx-auto space-y-6 md:space-y-8">
                {/* Create New Game Card */}
                <div
                    className="bg-blue-600 text-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow flex flex-col items-center justify-center text-center">
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

                {/* Draft Games Section */}
                <DraftGamesList
                    games={games.draft}
                    isLoading={isLoadingGames}
                    onResume={handleResumeDraft}
                    onDelete={(sessionId, gameName) => handleOpenDeleteModal(sessionId, gameName, 'draft')}
                />

                {/* Active and Completed Games */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <GameLists
                        currentGames={games.active}
                        completedGames={games.completed}
                        isLoading={isLoadingGames}
                        onGameSelect={(sessionId) => {
                            const isActive = games.active.some(g => g.id === sessionId);
                            const gameType = isActive ? 'active' : 'completed';
                            handleGameSelect(sessionId, gameType);
                        }}
                        onGameDelete={(sessionId, gameName) => handleOpenDeleteModal(sessionId, gameName, 'active')}
                    />
                </div>
            </main>

            {/* Enhanced Delete Confirmation Modal */}
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
