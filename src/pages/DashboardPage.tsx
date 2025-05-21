// src/pages/DashboardPage.tsx
import React, {useEffect, useState, useCallback} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {
    PlusCircle,
    CheckCircle,
    Activity,
    AlertTriangle,
    LogOut,
    RefreshCw
} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';
import {GameSession} from '../types';

interface GameListProps {
    title: string;
    games: GameSession[];
    isLoading: boolean;
    onGameSelect: (sessionId: string) => void;
    icon: React.ReactNode;
    listType: 'current' | 'completed';
}

const SimpleGameList: React.FC<GameListProps> = ({title, games, isLoading, onGameSelect, icon, listType}) => {
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
                            className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow hover:border-blue-300">
                            <button
                                onClick={() => onGameSelect(game.id)}
                                className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 text-left hover:bg-gray-50/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
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
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchGames = useCallback(async () => {
        if (!user) {
            setIsLoadingGames(false); // Ensure loading stops if no user
            return;
        }
        console.log("DashboardPage: Fetching games for user:", user.id);
        setIsLoadingGames(true);
        setFetchError(null);
        try {
            const {data, error} = await supabase
                .from('sessions')
                .select('*')
                .eq('teacher_id', user.id)
                .order('created_at', {ascending: false});

            if (error) throw error;

            if (data) {
                console.log("DashboardPage: Games fetched successfully", data);
                setCurrentGames(data.filter(session => !session.is_complete));
                setCompletedGames(data.filter(session => session.is_complete));
            } else {
                console.log("DashboardPage: No game data returned for user.");
                setCurrentGames([]);
                setCompletedGames([]);
            }
        } catch (err) {
            console.error("DashboardPage: Error fetching games:", err);
            const errorMessage = err instanceof Error ? err.message : "Could not load your game sessions.";
            setFetchError(errorMessage);
        } finally {
            setIsLoadingGames(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchGames();
        } else if (!authLoading && !user) {
            setIsLoadingGames(false);
            console.log("DashboardPage: Auth complete, but no user. Not fetching games.");
        }
        // If authLoading is true, we wait for it to complete.
    }, [user, authLoading, fetchGames]);

    const handleGameSelect = (sessionId: string) => {
        const selectedGame = [...currentGames, ...completedGames].find(g => g.id === sessionId);
        if (selectedGame) {
            if (selectedGame.is_complete) {
                // navigate(`/report/${sessionId}`); // Uncomment when report page is ready
                alert(`Navigating to report for completed game: ${sessionId} (Not yet implemented)`);
            } else {
                navigate(`/classroom/${sessionId}`);
            }
        }
    };

    const handleLogout = async () => {
        console.log("DashboardPage: handleLogout function CALLED");
        try {
            await signOut();
            console.log("DashboardPage: signOut from AuthContext completed. Navigating to /login.");
            navigate('/login', {replace: true});
        } catch (error) {
            console.error("DashboardPage: Logout process failed:", error);
            alert(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                    {fetchError && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md"
                             role="alert">
                            <div className="flex">
                                <div className="py-1"><AlertTriangle className="h-6 w-6 text-red-500 mr-3"/></div>
                                <div>
                                    <p className="font-bold">Error Loading Games</p>
                                    <p className="text-sm">{fetchError}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <SimpleGameList
                        title="Active Games" games={currentGames} isLoading={isLoadingGames && !fetchError}
                        onGameSelect={handleGameSelect} icon={<Activity size={20} className="text-orange-500"/>}
                        listType="current"
                    />
                    <SimpleGameList
                        title="Completed Games" games={completedGames} isLoading={isLoadingGames && !fetchError}
                        onGameSelect={handleGameSelect} icon={<CheckCircle size={20} className="text-green-500"/>}
                        listType="completed"
                    />
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;