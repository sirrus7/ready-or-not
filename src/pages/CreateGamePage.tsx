// src/pages/CreateGamePage.tsx
import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';
// import {GameSession} from '../types'; // Assuming GameSession might be useful for type hints

import Step1GameDetails from '../components/TeacherHost/CreateGameWizard/Step1_GameDetails';
import Step2PrintHandouts from '../components/TeacherHost/CreateGameWizard/Step2_PrintHandouts';
import Step3TeamSetup from '../components/TeacherHost/CreateGameWizard/Step3_TeamSetup';
import Step4RoomSetup from '../components/TeacherHost/CreateGameWizard/Step4_RoomSetup';
import Step5Finalize from '../components/TeacherHost/CreateGameWizard/Step5_Finalize';

import {ArrowLeft, Settings, Zap, ListOrdered, Printer, Users, Rocket, CheckCircle, AlertTriangle} from 'lucide-react';
import {readyOrNotGame_2_0_DD} from "../data/gameStructure.ts";

// Define a type for the game data being collected through the wizard
export interface NewGameData {
    game_version: '2.0_dd' | '1.5_dd';
    name: string;
    class_name: string;
    grade_level: string;
    num_players: number;
    num_teams: number; // Will be derived or confirmed
    // Potentially add team names if configured in Step 3
    teams_config?: Array<{ name: string, passcode?: string }>; // Passcodes generated server-side or on finalize
    // Add any other fields collected during the wizard
}

const initialNewGameData: NewGameData = {
    game_version: '2.0_dd',
    name: '',
    class_name: '',
    grade_level: 'Freshman', // Default value
    num_players: 0,
    num_teams: 0,
};

const WIZARD_STEPS = [
    {id: 1, title: 'Game Details', component: Step1GameDetails, icon: Settings},
    {id: 2, title: 'Print Handouts', component: Step2PrintHandouts, icon: Printer},
    {id: 3, title: 'Team Setup', component: Step3TeamSetup, icon: Users},
    {id: 4, title: 'Room & Screen Setup', component: Step4RoomSetup, icon: ListOrdered}, // Used ListOrdered as a placeholder
    {id: 5, title: 'Finalize & Start', component: Step5Finalize, icon: Rocket},
];

const CreateGamePage: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [gameData, setGameData] = useState<NewGameData>(initialNewGameData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {user} = useAuth();
    const navigate = useNavigate();

    // Redirect if user is not logged in (though PrivateRoute should handle this for /create-game)
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleNextStep = (dataFromStep?: Partial<NewGameData>) => {
        if (dataFromStep) {
            setGameData(prev => ({...prev, ...dataFromStep}));
        }
        if (currentStep < WIZARD_STEPS.length) {
            setCurrentStep(prev => prev + 1);
        } else {
            // Final step - create the game session
            handleFinalizeGame();
        }
    };

    const handlePreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        } else {
            navigate('/dashboard'); // Or to wherever they came from
        }
    };

    const handleDataChange = (field: keyof NewGameData, value: any) => {
        setGameData(prev => ({...prev, [field]: value}));
        // If num_players changes, num_teams might need recalculation or validation
        if (field === 'num_players' && typeof value === 'number') {
            // Logic from demo: 1-4 players = 1 team, 5-8 = 2 teams etc. or custom.
            // This logic will primarily live in Step1_GameDetails.tsx
            // But if it impacts num_teams directly, update it here or pass a setter down.
            // For now, Step1 will manage its internal num_teams recommendation.
        }
    };

    const handleFinalizeGame = async () => {
        if (!user) {
            setError("User not authenticated.");
            return;
        }
        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Create the Game Session in Supabase
            const {data: newSession, error: sessionError} = await supabase
                .from('sessions')
                .insert({
                    name: gameData.name,
                    teacher_id: user.id,
                    class_name: gameData.class_name,
                    grade_level: gameData.grade_level,
                    game_version: gameData.game_version,
                    // Initial state for a newly created game from wizard
                    current_phase_id: readyOrNotGame_2_0_DD.welcome_phases[0]?.id || null, // Start with first welcome phase
                    current_slide_id_in_phase: 0,
                    is_playing: false,
                    is_complete: false,
                    teacher_notes: {},
                    // Store num_players and num_teams if schema allows
                    // num_players: gameData.num_players,
                    // num_teams_configured: gameData.num_teams,
                })
                .select()
                .single();

            if (sessionError) throw sessionError;
            if (!newSession) throw new Error("Failed to create game session record.");

            // 2. Create Teams for this session in Supabase
            // This would use gameData.teams_config if Step 3 allows custom names,
            // or generate default names based on gameData.num_teams.
            // Passcodes should be generated here.
            const teamPromises = [];
            for (let i = 0; i < gameData.num_teams; i++) {
                const teamName = gameData.teams_config?.[i]?.name || `Team ${String.fromCharCode(65 + i)}`; // Team A, B, C...
                const passcode = Math.floor(100 + Math.random() * 900).toString(); // Simple 3-digit passcode
                teamPromises.push(
                    supabase.from('teams').insert({
                        session_id: newSession.id,
                        name: teamName,
                        passcode: passcode,
                    })
                );
            }
            const teamResults = await Promise.all(teamPromises);
            teamResults.forEach(result => {
                if (result.error) console.error("Error creating team:", result.error); // Log partial errors
            });
            // Check if any team creation failed critically if necessary

            // 3. Initialize TeamRoundData for Round 1 for each team (optional, can be lazy-loaded)
            // This would set starting KPIs. For now, AppContext handles fetching/creating this on demand.

            setIsSubmitting(false);
            // Navigate to the GameHostPage for the newly created session
            navigate(`/classroom/${newSession.id}`);

        } catch (err) {
            console.error("Error finalizing game:", err);
            setError(err instanceof Error ? err.message : "An unexpected error occurred while creating the game.");
            setIsSubmitting(false);
        }
    };


    const CurrentStepComponent = WIZARD_STEPS[currentStep - 1].component;
    const CurrentStepIcon = WIZARD_STEPS[currentStep - 1].icon;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8">
            <div className="w-full max-w-3xl">
                {/* Header */}
                <div className="mb-8 text-center">
                    <Zap size={48} className="text-blue-600 mx-auto mb-3"/>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Create New Game Simulation</h1>
                    <p className="text-gray-600 mt-1">Follow these steps to set up your "Ready or Not" session.</p>
                </div>

                {/* Progress Indicator (Simple Version) */}
                <div className="mb-8 flex justify-center items-center space-x-2 sm:space-x-4">
                    {WIZARD_STEPS.map((step, index) => (
                        <React.Fragment key={step.id}>
                            <div
                                className={`flex flex-col items-center text-center ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>
                                <div
                                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                ${currentStep === step.id ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-110' :
                                        currentStep > step.id ? 'bg-blue-500 text-white border-blue-600' :
                                            'bg-white border-gray-300 group-hover:border-blue-400'}`}
                                >
                                    {currentStep > step.id ? <CheckCircle size={18}/> : <step.icon size={16}/>}
                                </div>
                                <span
                                    className={`mt-1.5 text-xs sm:text-sm font-medium transition-colors duration-300 ${currentStep === step.id ? 'text-blue-700' : currentStep > step.id ? 'text-blue-600' : 'text-gray-500'}`}>
                  {step.title}
                </span>
                            </div>
                            {index < WIZARD_STEPS.length - 1 && (
                                <div
                                    className={`flex-1 h-0.5 max-w-12 sm:max-w-16 ${currentStep > step.id ? 'bg-blue-500' : 'bg-gray-300'}`}/>
                            )}
                        </React.Fragment>
                    ))}
                </div>


                {/* Step Content Area */}
                <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl border border-gray-200">
                    <div className="flex items-center mb-6">
                        <CurrentStepIcon size={24} className="text-blue-600 mr-3"/>
                        <h2 className="text-xl md:text-2xl font-semibold text-gray-700">
                            Step {currentStep}: {WIZARD_STEPS[currentStep - 1].title}
                        </h2>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm">
                            <AlertTriangle size={16} className="inline mr-2"/> {error}
                        </div>
                    )}

                    <CurrentStepComponent
                        gameData={gameData}
                        onDataChange={handleDataChange} // For controlled components within steps
                        onNext={handleNextStep}
                        onPrevious={handlePreviousStep} // Some steps might not show 'Previous'
                    />
                </div>

                {/* Navigation Buttons (might be part of each step component for more control) */}
                {/* For now, keeping basic navigation outside for simplicity if steps don't have their own nav */}
                <div className="mt-8 flex justify-between items-center">
                    <button
                        onClick={handlePreviousStep}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        <ArrowLeft size={18}/>
                        {currentStep === 1 ? 'Back to Dashboard' : 'Previous'}
                    </button>
                    {/* Next/Finalize button is usually part of the step component itself */}
                </div>
            </div>
        </div>
    );
};

export default CreateGamePage;