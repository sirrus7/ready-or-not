// src/views/host/pages/DashboardPage.tsx - Fixed infinite refresh loop
import React, {useEffect, useRef} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {
    PlusCircle, Play, Edit, Clock, CheckCircle, Trash2, BarChart3, RefreshCw, LogOut,
    FileText, Download, BookOpen, Users, TrendingUp
} from 'lucide-react';
import {useAuth} from '@app/providers/AuthProvider';
import {useDashboardData} from '@views/host/hooks/useDashboardData';
import {useDashboardActions} from '@views/host/hooks/useDashboardActions';
import NotificationBanner from '@views/host/components/Dashboard/NotificationBanner';
import DeleteConfirmModal from '@views/host/components/Dashboard/DeleteConfirmModal';
import {GameSession} from '@shared/types';
import RonBotWidget from '@shared/components/RonBotWidget.tsx';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';

const DashboardPage: React.FC = () => {
    const {user, loading: authLoading} = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Ready or Not - Dashboard";
    }, []);

    // Check if we need to auto-refresh
    const shouldAutoRefresh = location.state?.forceRefresh === true;
    const autoRefreshHandled = useRef(false); // Prevent multiple auto-refreshes

    const {
        games,
        isLoadingGames,
        gamesError,
        refetchGames,
        clearCache
    } = useDashboardData(user?.id);

    const {
        notification,
        isDeleteModalOpen,
        gameToDelete,
        isDeleting,
        deleteError,
        handleResumeDraft,
        handleOpenDeleteModal,
        handleConfirmDelete,
        handleLogout,
        dismissNotification,
        closeDeleteModal
    } = useDashboardActions(refetchGames);

    // FIXED: Auto-refresh when returning from cancelled draft creation
    useEffect(() => {
        if (shouldAutoRefresh && !authLoading && user && !autoRefreshHandled.current) {
            autoRefreshHandled.current = true; // Prevent multiple executions

            // Clear the location state immediately to prevent re-triggering
            window.history.replaceState({}, '', '/dashboard');

            // Clear cache and refetch with a small delay
            setTimeout(async () => {
                clearCache();
                await refetchGames();
            }, 100);
        }
    }, [shouldAutoRefresh, authLoading, user, clearCache, refetchGames]);

    // Manual refresh function
    const handleManualRefresh = async () => {
        clearCache();
        await refetchGames();
    };

    // Combine active and draft games
    const activeGames = [
        ...games.draft.map(game => ({...game, displayStatus: 'draft' as const})),
        ...games.active.map(game => ({...game, displayStatus: 'active' as const}))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const completedGames = games.completed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const getStatusConfig = (status: 'draft' | 'active' | 'completed') => {
        switch (status) {
            case 'draft':
                return {
                    label: 'Draft',
                    color: 'bg-game-orange-100 text-game-orange-800 border-game-orange-200',
                    icon: Edit,
                    description: 'Being set up'
                };
            case 'active':
                return {
                    label: 'Active',
                    color: 'bg-game-orange-100 text-game-orange-800 border-game-orange-200',
                    icon: Play,
                    description: 'In progress'
                };
            case 'completed':
                return {
                    label: 'Completed',
                    color: 'bg-game-brown-100 text-game-brown-800 border-game-brown-200',
                    icon: CheckCircle,
                    description: 'Finished'
                };
        }
    };

    const handleGameAction = (game: GameSession & { displayStatus?: 'draft' | 'active' | 'completed' }) => {
        const status = game.displayStatus || 'completed';
        if (status === 'draft') {
            handleResumeDraft(game.id, game.name);
        } else if (status === 'active') {
            navigate(`/host/${game.id}`);
        } else {
            // Navigate to game results/analytics page
            navigate(`/results/${game.id}`);
        }
    };

    const getActionButton = (game: GameSession & { displayStatus?: 'draft' | 'active' | 'completed' }) => {
        const status = game.displayStatus || 'completed';
        switch (status) {
            case 'draft':
                return (
                    <button
                        onClick={() => handleGameAction(game)}
                        className="bg-game-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-game-orange-700 transition-colors flex items-center gap-2"
                    >
                        <Edit size={16}/>
                        Resume Setup
                    </button>
                );
            case 'active':
                return (
                    <button
                        onClick={() => handleGameAction(game)}
                        className="bg-game-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-game-orange-600 transition-colors flex items-center gap-2"
                    >
                        <Play size={16}/>
                        Open Game
                    </button>
                );
            case 'completed':
                return (
                    <button
                        onClick={() => handleGameAction(game)}
                        className="bg-game-brown-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-game-brown-700 transition-colors flex items-center gap-2"
                    >
                        <BarChart3 size={16}/>
                        View Results
                    </button>
                );
        }
    };

    // Loading state
    if (authLoading && !user) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-game-cream-50 to-game-cream-100 flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-game-orange-600"></div>
                <p className="mt-4 text-gray-600">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-game-cream-50 to-game-cream-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <header className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            {/* Logo */}
                            <img
                                src="/images/ready-or-not-logo.png"
                                alt="Ready or Not 2.0"
                                className="h-24 w-auto rounded-lg shadow-sm"
                            />

                            {/* Welcome Text */}
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                                    Welcome back!
                                </h1>
                                <p className="text-gray-600 text-lg">
                                    {user?.email ?
                                        `Ready to facilitate, ${user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)}?` :
                                        'Ready to create amazing simulation experiences?'
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                to="/create"
                                className="flex items-center gap-2 bg-game-orange-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-game-orange-700 transition-colors shadow-lg"
                            >
                                <PlusCircle size={20}/>
                                Create New Game
                            </Link>
                            <button
                                onClick={handleManualRefresh}
                                disabled={isLoadingGames}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-game-orange-600 hover:bg-game-orange-50 rounded-lg transition-colors border border-gray-200 hover:border-game-orange-300"
                                title="Refresh games"
                            >
                                <RefreshCw size={16} className={isLoadingGames ? 'animate-spin' : ''}/>
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                            >
                                <LogOut size={16}/>
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </header>

                <NotificationBanner
                    notification={notification || (gamesError ? {
                        type: 'error',
                        message: gamesError
                    } : null) || (deleteError ? {type: 'error', message: deleteError} : null)}
                    onDismiss={dismissNotification}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* My Games Section */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                            <div className="bg-game-orange-100 p-2 rounded-lg">
                                                <Play size={24} className="text-game-orange-600"/>
                                            </div>
                                            My Games
                                        </h2>
                                        <p className="text-gray-600 mt-1">Active and draft simulation sessions</p>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {activeGames.length} games
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {isLoadingGames ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div
                                            className="animate-spin rounded-full h-8 w-8 border-b-2 border-game-orange-500 mr-3"></div>
                                        <span className="text-gray-500">Loading games...</span>
                                    </div>
                                ) : activeGames.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div
                                            className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                            <Clock size={32} className="text-gray-400"/>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No active games</h3>
                                        <p className="text-gray-500">Your active and draft games will appear here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {activeGames.map((game) => {
                                            const statusConfig = getStatusConfig(game.displayStatus);
                                            const StatusIcon = statusConfig.icon;

                                            return (
                                                <div
                                                    key={game.id}
                                                    className="border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 hover:border-game-orange-200 bg-white"
                                                >
                                                    <div className="p-6">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                                        {game.name}
                                                                    </h3>
                                                                    <span
                                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                                                        <StatusIcon size={12}/>
                                                                        {statusConfig.label}
                                                                    </span>
                                                                    {game.current_slide_index !== null && (() => {
                                                                        const slide = readyOrNotGame_2_0_DD.slides[game.current_slide_index];
                                                                        const round = slide?.round_number || 0;
                                                                        const slideId = Math.floor(slide?.id || 0);
                                                                        const progressText = round === 0 ? `Setup - Slide ${slideId}` : `Round ${round} - Slide ${slideId}`;

                                                                        return (
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
                                                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                                                                                {progressText}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                                                                    {/* Class Name - Critical for Multiple Classes */}
                                                                    <div>
                                                                        <span className="font-medium text-gray-700">Class:</span>
                                                                        <div className="text-gray-500">
                                                                            {game.class_name || 'No class set'}
                                                                        </div>
                                                                    </div>

                                                                    {/* Grade Level - Audience Context */}
                                                                    <div>
                                                                        <span className="font-medium text-gray-700">Level:</span>
                                                                        <div className="text-gray-500">
                                                                            {game.grade_level || 'Not specified'}
                                                                        </div>
                                                                    </div>

                                                                    {/* Last Updated - More Useful Than Created */}
                                                                    <div>
                                                                        <span className="font-medium text-gray-700">Updated:</span>
                                                                        <div className="text-gray-500">
                                                                            {new Date(game.updated_at).toLocaleDateString()}
                                                                        </div>
                                                                    </div>

                                                                    {/* Game Version - Keep This for Context */}
                                                                    <div>
                                                                        <span className="font-medium text-gray-700">Version:</span>
                                                                        <div className="text-gray-500">
                                                                            v{game.game_version.startsWith('2') ? '2.0' : '1.5'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 ml-6">
                                                                {getActionButton(game)}

                                                                <button
                                                                    onClick={() => handleOpenDeleteModal(
                                                                        game.id,
                                                                        game.name,
                                                                        game.displayStatus === 'draft' ? 'draft' : 'active'
                                                                    )}
                                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title={`Delete ${game.displayStatus} game`}
                                                                >
                                                                    <Trash2 size={18}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Completed Games Section */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                            <div className="bg-green-100 p-2 rounded-lg">
                                                <CheckCircle size={24} className="text-green-600"/>
                                            </div>
                                            Completed Games
                                        </h2>
                                        <p className="text-gray-600 mt-1">View results and analytics from finished
                                            sessions</p>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {completedGames.length} completed
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {completedGames.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div
                                            className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                            <TrendingUp size={32} className="text-gray-400"/>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No completed games
                                            yet</h3>
                                        <p className="text-gray-500">Completed games will appear here with full
                                            analytics and results</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {completedGames.map((game) => (
                                            <div
                                                key={game.id}
                                                className="border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 hover:border-green-200 bg-white"
                                            >
                                                <div className="p-6">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                                    {game.name}
                                                                </h3>
                                                                <span
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                                                                    <CheckCircle size={12}/>
                                                                    Completed
                                                                </span>
                                                                {game.current_slide_index !== null && (() => {
                                                                    const slide = readyOrNotGame_2_0_DD.slides[game.current_slide_index];
                                                                    const round = slide?.round_number || 0;
                                                                    const slideId = Math.floor(slide?.id || 0);
                                                                    const progressText = round === 0 ? `Setup - Slide ${slideId}` : `Round ${round} - Slide ${slideId}`;

                                                                    return (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
                                                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                                                                            {progressText}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>

                                                            <div
                                                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                                                                <div>
                                                                    <span
                                                                        className="font-medium text-gray-700">Completed:</span>
                                                                    <div>{new Date(game.updated_at).toLocaleDateString()}</div>
                                                                </div>
                                                                {game.class_name && (
                                                                    <div>
                                                                        <span
                                                                            className="font-medium text-gray-700">Class:</span>
                                                                        <div
                                                                            className="truncate">{game.class_name}</div>
                                                                    </div>
                                                                )}
                                                                {game.game_version && (
                                                                    <div>
                                                                        <span
                                                                            className="font-medium text-gray-700">Version:</span>
                                                                        <div>v{game.game_version.startsWith('2') ? '2.0' : '1.5'}</div>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <span
                                                                        className="font-medium text-gray-700">Duration:</span>
                                                                    <div className="text-gray-500">
                                                                        {Math.ceil((new Date(game.updated_at).getTime() - new Date(game.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 ml-6">
                                                            <button
                                                                onClick={() => navigate(`/results/${game.id}`)}
                                                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="View results"
                                                            >
                                                                <BarChart3 size={18}/>
                                                            </button>

                                                            <button
                                                                onClick={() => handleOpenDeleteModal(game.id, game.name, 'completed')}
                                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete completed game"
                                                            >
                                                                <Trash2 size={18}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Resources */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <BookOpen size={20} className="text-game-orange-600"/>
                                    Game Resources
                                </h3>
                            </div>
                            <div className="p-6 space-y-4">
                                <a
                                    href="/game-materials/core/how-to-host-guide.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                    <div
                                        className="bg-game-orange-100 p-2 rounded-lg group-hover:bg-game-orange-200 transition-colors">
                                        <FileText size={16} className="text-game-orange-600"/>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">How to Host Guide</div>
                                        <div className="text-sm text-gray-500">Complete facilitation manual</div>
                                    </div>
                                    <Download size={16} className="text-gray-400 group-hover:text-gray-600"/>
                                </a>

                                <a
                                    href="/game-materials/core/vocabulary-definitions.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                    <div
                                        className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200 transition-colors">
                                        <BookOpen size={16} className="text-green-600"/>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">Vocabulary Definitions</div>
                                        <div className="text-sm text-gray-500">Business terms reference</div>
                                    </div>
                                    <Download size={16} className="text-gray-400 group-hover:text-gray-600"/>
                                </a>

                                <a
                                    href="/game-materials/core/vocabulary-quiz.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                    <div
                                        className="bg-orange-100 p-2 rounded-lg group-hover:bg-orange-200 transition-colors">
                                        <Users size={16} className="text-orange-600"/>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">Vocabulary Quiz</div>
                                        <div className="text-sm text-gray-500">Assessment tool</div>
                                    </div>
                                    <Download size={16} className="text-gray-400 group-hover:text-gray-600"/>
                                </a>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div
                            className="bg-gradient-to-br from-game-orange-600 to-game-orange-700 text-white rounded-2xl shadow-lg">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Game Metrics</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white">Total Sessions:</span>
                                        <span className="font-bold">{activeGames.length + completedGames.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white">Completed:</span>
                                        <span className="font-bold">{completedGames.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white">Success Rate:</span>
                                        <span className="font-bold">
                                            {activeGames.length + completedGames.length > 0
                                                ? Math.round((completedGames.length / (activeGames.length + completedGames.length)) * 100)
                                                : 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <RonBotWidget/>
            </div>

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
