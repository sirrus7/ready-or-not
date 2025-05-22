// src/pages/DashboardPage.tsx
import React, {useEffect, useState, useCallback} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {
    PlusCircle,
    CheckCircle,
    Activity,
    AlertTriangle,
    LogOut,
    RefreshCw,
    Trash2,
    XCircle
} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';
import {GameSession} from '../types';
import Modal from '../components/UI/Modal';

interface GameListProps {
    title: string;
    games: GameSession[];
    isLoading: boolean;
    onGameSelect: (sessionId: string) => void;
    onGameDelete?: (sessionId: string, gameName: string) => void;
    icon: React.ReactNode;
    listType: 'current' | 'completed';
}

const SimpleGameList: React.FC<GameListProps> = ({
                                                     title,
                                                     games,
                                                     isLoading,
                                                     onGameSelect,
                                                     onGameDelete,
                                                     icon,
                                                     listType
                                                 }) => {
    if (isLoading) {
        return (
            <div
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-500">Loading {listType} games...</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-700 mb-4 flex items-center">
                {icon}
                <span className="ml-2">{title}</span>
                <span
                    className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">{games.length}</span>
            </h2>
            {games.length === 0 &&
                <p className="text-gray-500 italic text-sm px-1 py-4 text-center">No {listType} games found.</p>}
            {games.length > 0 && (
                <ul className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
                    {games.map((game) => (
                        <li key={game.id}
                            className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow hover:border-blue-300 flex items-center pr-2">
                            <button
                                onClick={() => onGameSelect(game.id)}
                                className="flex-grow flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 text-left hover:bg-gray-50/80 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
                            >
                                <div className="flex-grow mb-1 sm:mb-0">
                                    <span
                                        className="font-medium text-blue-600 block text-base leading-tight">{game.name || `Session ${game.id.substring(0, 8)}`}</span>
                                    <span className="text-xs text-gray-500">
                                        Created: {new Date(game.created_at).toLocaleDateString()}
                                        {game.class_name && ` | Class: ${game.class_name}`}
                                        {game.game_version && ` | v${game.game_version.startsWith('2') ? '2.0' : '1.5'}`}
                                    </span>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                                    game.is_complete ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                }`}>
                                    {game.is_complete ? 'Completed' : 'In Progress'}
                                </span>
                            </button>
                            {listType === 'current' && onGameDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGameDelete(game.id, game.name || `Session ${game.id.substring(0, 8)}`);
                                    }}
                                    className="ml-2 p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                                    title="Delete Game Session"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const DashboardPage: React.FC = () => {
    const {user, signOut, loading: authLoading} = useAuth();
    const navigate = useNavigate();
    const [currentGames, setCurrentGames] = useState<GameSession[]>([]);
    const [completedGames, setCompletedGames] = useState<GameSession[]>([]);
    const [isLoadingGames, setIsLoadingGames] = useState<boolean>(true);

    // Unified message state: can be for errors or success
    const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
    const [gameToDelete, setGameToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);


    const fetchGames = useCallback(async () => {
        if (!user) {
            setIsLoadingGames(false);
            return;
        }
        setIsLoadingGames(true);
        setNotification(null); // Clear previous notifications on new fetch
        try {
            const {data, error} = await supabase
                .from('sessions')
                .select('*')
                .eq('teacher_id', user.id)
                .order('created_at', {ascending: false});

            if (error) throw error;

            if (data) {
                setCurrentGames(data.filter(session => !session.is_complete));
                setCompletedGames(data.filter(session => session.is_complete));
            } else {
                setCurrentGames([]);
                setCompletedGames([]);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Could not load your game sessions.";
            setNotification({type: 'error', message: errorMessage});
        } finally {
            setIsLoadingGames(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchGames();
        } else if (!authLoading && !user) {
            setIsLoadingGames(false);
        }
    }, [user, authLoading, fetchGames]);

    const handleGameSelect = (sessionId: string) => {
        const selectedGame = [...currentGames, ...completedGames].find(g => g.id === sessionId);
        if (selectedGame) {
            if (selectedGame.is_complete) {
                alert(`Navigating to report for completed game: ${sessionId} (Not yet implemented)`);
            } else {
                navigate(`/classroom/${sessionId}`);
            }
        }
    };

    const handleOpenDeleteModal = (sessionId: string, gameName: string) => {
        setGameToDelete({id: sessionId, name: gameName});
        setNotification(null); // Clear any existing notifications
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!gameToDelete || !user) return;
        setIsDeleting(true);
        setNotification(null);

        try {
            const {error: deleteSessionError} = await supabase
                .from('sessions')
                .delete()
                .eq('id', gameToDelete.id)
                .eq('teacher_id', user.id);

            if (deleteSessionError) {
                throw deleteSessionError;
            }

            setCurrentGames(prev => prev.filter(game => game.id !== gameToDelete.id));
            setNotification({type: 'success', message: `Game "${gameToDelete.name}" deleted successfully.`});
            // Auto-dismiss success message after a few seconds
            setTimeout(() => setNotification(null), 4000);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Could not delete the game session.";
            setNotification({type: 'error', message: errorMessage});
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setGameToDelete(null);
        }
    };


    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/login', {replace: true});
        } catch (error) {
            setNotification({
                type: 'error',
                message: `Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    };

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
            <header
                className="max-w-6xl mx-auto mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">Teacher Dashboard</h1>
                    <p className="text-gray-600 text-sm md:text-base">Welcome, {user?.email?.split('@')[0] || 'Teacher'}!</p>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 mt-3 sm:mt-0">
                    <button
                        onClick={fetchGames}
                        disabled={isLoadingGames}
                        className="flex items-center gap-1.5 text-xs sm:text-sm text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-lg font-medium transition-colors border border-blue-200 disabled:opacity-70"
                        title="Refresh game lists"
                    >
                        <RefreshCw size={14} className={isLoadingGames ? 'animate-spin' : ''}/> Refresh
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-xs sm:text-sm text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 px-3 py-2 rounded-lg font-medium transition-colors border border-red-200"
                    >
                        <LogOut size={14}/> Logout
                    </button>
                </div>
            </header>

            {/* Notification Area */}
            {notification && (
                <div className={`max-w-6xl mx-auto mb-4 p-4 rounded-md shadow-md text-sm
                    ${notification.type === 'error' ? 'bg-red-100 border-l-4 border-red-500 text-red-700' :
                    'bg-green-100 border-l-4 border-green-500 text-green-700'}`}
                     role="alert">
                    <div className="flex">
                        <div className="py-1">
                            {notification.type === 'error' ?
                                <AlertTriangle className="h-6 w-6 mr-3"/> :
                                <CheckCircle className="h-6 w-6 mr-3"/>}
                        </div>
                        <div>
                            <p className="font-bold">{notification.type === 'error' ? 'Error' : 'Success'}</p>
                            <p>{notification.message}</p>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className="ml-auto -mx-1.5 -my-1.5 bg-transparent rounded-lg focus:ring-2 p-1.5 inline-flex h-8 w-8"
                            aria-label="Dismiss"
                        >
                            <XCircle className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
            )}

            <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <div
                    className="md:col-span-1 bg-blue-600 text-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow flex flex-col items-center justify-center text-center order-first md:order-none">
                    <PlusCircle size={40} className="mb-2 opacity-80"/>
                    <h2 className="text-xl lg:text-2xl font-bold mb-1.5">Start a New Game</h2>
                    <p className="text-xs lg:text-sm opacity-90 mb-5">
                        Set up a new "Ready or Not" simulation for your class.
                    </p>
                    <Link
                        to="/create-game"
                        onClick={() => console.log("DashboardPage: 'Create Game' link clicked, navigating to /create-game")}
                        className="bg-white text-blue-700 font-semibold py-2.5 px-6 lg:py-3 lg:px-8 rounded-lg hover:bg-blue-50 transition-colors shadow-md text-sm lg:text-base"
                    >
                        Create Game
                    </Link>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <SimpleGameList
                        title="Active Games" games={currentGames} isLoading={isLoadingGames && !notification?.message}
                        onGameSelect={handleGameSelect}
                        onGameDelete={handleOpenDeleteModal}
                        icon={<Activity size={20} className="text-orange-500"/>}
                        listType="current"
                    />
                    <SimpleGameList
                        title="Completed Games" games={completedGames}
                        isLoading={isLoadingGames && !notification?.message}
                        onGameSelect={handleGameSelect}
                        icon={<CheckCircle size={20} className="text-green-500"/>}
                        listType="completed"
                    />
                </div>
            </main>

            {isDeleteModalOpen && gameToDelete && (
                <Modal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        if (!isDeleting) setIsDeleteModalOpen(false);
                    }}
                    title="Confirm Delete Game Session"
                    size="sm"
                >
                    <div className="p-1">
                        <div className="flex items-start">
                            <div
                                className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100 sm:mx-0 sm:h-8 sm:w-8">
                                <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true"/>
                            </div>
                            <div className="ml-3 text-left">
                                <p className="text-sm text-gray-700 mt-0.5">
                                    Are you sure you want to delete the game session <strong
                                    className="font-semibold">{gameToDelete.name}</strong>?
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                    This action cannot be undone. All associated team data, decisions, and KPIs for this
                                    session will be permanently removed.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 sm:mt-6 flex flex-row-reverse gap-3">
                            <button
                                type="button"
                                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm disabled:opacity-50 w-full sm:w-auto"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <RefreshCw className="animate-spin h-5 w-5 mr-2"/>
                                ) : (
                                    <Trash2 className="h-5 w-5 mr-2"/>
                                )}
                                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                            <button
                                type="button"
                                className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 w-full sm:w-auto"
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isDeleting}
                            >
                                <XCircle className="h-5 w-5 mr-2"/>
                                Cancel
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DashboardPage;