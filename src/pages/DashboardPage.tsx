// src/pages/DashboardPage.tsx
import React, {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {
    PlusCircle,
    CheckCircle,
    Activity,
    AlertTriangle,
    LogOut,
} from 'lucide-react';
// import {useAppContext} from '../context/AppContext'; // If we need to fetch game lists via context
import {useAuth} from '../context/AuthContext'; // For user info and logout
import {supabase} from '../lib/supabase';
import {GameSession} from '../types'; // Assuming GameSession type includes necessary details

// Placeholder for a more detailed GameList component we'll create
// For now, a simple list rendering
interface GameListProps {
    title: string;
    games: GameSession[];
    isLoading: boolean;
    error?: string | null;
    onGameSelect: (sessionId: string) => void;
    icon: React.ReactNode;
}

const SimpleGameList: React.FC<GameListProps> = ({title, games, isLoading, error, onGameSelect, icon}) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                {icon}
                <span className="ml-2">{title}</span>
            </h2>
            {isLoading && <p className="text-gray-500">Loading games...</p>}
            {error &&
                <p className="text-red-500 flex items-center"><AlertTriangle size={18} className="mr-2"/> {error}</p>}
            {!isLoading && !error && games.length === 0 && <p className="text-gray-500 italic">No games found.</p>}
            {!isLoading && !error && games.length > 0 && (
                <ul className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                    {games.map((game) => (
                        <li key={game.id}
                            className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                            <button
                                onClick={() => onGameSelect(game.id)}
                                className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 rounded-lg"
                            >
                                <div>
                                    <span
                                        className="font-medium text-blue-600 block">{game.name || `Session ${game.id.substring(0, 8)}`}</span>
                                    <span className="text-xs text-gray-500">
                    Created: {new Date(game.created_at).toLocaleDateString()}
                                        {game.class_name && ` | Class: ${game.class_name}`}
                  </span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    game.is_complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
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
    const {user, signOut} = useAuth();
    const navigate = useNavigate();
    const [currentGames, setCurrentGames] = useState<GameSession[]>([]);
    const [completedGames, setCompletedGames] = useState<GameSession[]>([]);
    const [isLoadingGames, setIsLoadingGames] = useState<boolean>(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGames = async () => {
            if (!user) return;
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
                    setCurrentGames(data.filter(session => !session.is_complete));
                    setCompletedGames(data.filter(session => session.is_complete));
                }
            } catch (err) {
                console.error("Error fetching games:", err);
                setFetchError("Could not load your game sessions. Please try again later.");
            } finally {
                setIsLoadingGames(false);
            }
        };

        fetchGames();
    }, [user]);

    const handleGameSelect = (sessionId: string) => {
        // If game is not complete, navigate to GameHostPage (previously MainPage)
        // If game is complete, navigate to CompletedGameReportPage
        const selectedGame = [...currentGames, ...completedGames].find(g => g.id === sessionId);
        if (selectedGame) {
            if (selectedGame.is_complete) {
                navigate(`/report/${sessionId}`);
            } else {
                navigate(`/classroom/${sessionId}`);
            }
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error("Logout failed:", error);
            // Handle logout error display if necessary
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 p-4 md:p-8">
            <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Teacher Dashboard</h1>
                    <p className="text-gray-600 text-sm">Welcome back, {user?.email?.split('@')[0] || 'Teacher'}!</p>
                </div>
                <div className="flex items-center space-x-3">
                    {/* Future: Settings, Profile, Help links */}
                    {/* <button className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-100"><Settings size={20}/></button>
            <button className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-100"><UserCircle size={20}/></button>
            <button className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-100"><HelpCircle size={20}/></button> */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200"
                    >
                        <LogOut size={16}/>
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Create New Game CTA - Spans full width on small, 1/3 on medium+ */}
                <div
                    className="md:col-span-1 bg-blue-600 text-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow flex flex-col items-center justify-center text-center">
                    <PlusCircle size={48} className="mb-3 opacity-80"/>
                    <h2 className="text-2xl font-bold mb-2">Start a New Game</h2>
                    <p className="text-sm opacity-90 mb-6">
                        Set up a new "Ready or Not" simulation for your class.
                    </p>
                    <Link
                        to="/classroom/new" // This will trigger new session creation in AppContext
                        className="bg-white text-blue-700 font-semibold py-3 px-8 rounded-lg hover:bg-blue-50 transition-colors shadow-md text-lg"
                    >
                        Create Game
                    </Link>
                </div>

                {/* Game Lists - Span 2/3 on medium+ */}
                <div className="md:col-span-2 space-y-6">
                    <SimpleGameList
                        title="Active Games"
                        games={currentGames}
                        isLoading={isLoadingGames}
                        error={fetchError}
                        onGameSelect={handleGameSelect}
                        icon={<Activity size={24} className="text-yellow-500"/>}
                    />
                    <SimpleGameList
                        title="Completed Games"
                        games={completedGames}
                        isLoading={isLoadingGames}
                        error={fetchError}
                        onGameSelect={handleGameSelect}
                        icon={<CheckCircle size={24} className="text-green-500"/>}
                    />
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;