// src/pages/CreateGamePage.tsx - Updated with New Supabase Structure
import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {db} from '../utils/supabase';
import {useSupabaseMutation} from '../hooks/useSupabaseOperation'
import {NewGameData} from '../types';

import Step1GameDetails from '../components/Host/CreateGame/Step1';
import Step2TeamSetup from '../components/Host/CreateGame/Step2_TeamSetup.tsx';
import Step3RoomSetup from '../components/Host/CreateGame/Step3_RoomSetup.tsx';
import Step4PrintHandouts from '../components/Host/CreateGame/Step4_PrintHandouts.tsx';
import Step5Finalize from '../components/Host/CreateGame/Step5_Finalize';

import {ArrowLeft, Settings, Printer, Users, ListOrdered, Rocket, Zap, CheckCircle, AlertTriangle} from 'lucide-react';
import {readyOrNotGame_2_0_DD} from '../data/gameStructure';

const initialNewGameData: NewGameData = {
    game_version: '2.0_dd',
    name: '',
    class_name: '',
    grade_level: 'Freshman',
    num_players: 0,
    num_teams: 0,
    teams_config: [],
};

const WIZARD_STEPS = [
    {id: 1, title: 'Game Details', component: Step1GameDetails, icon: Settings},
    {id: 2, title: 'Team Setup', component: Step2TeamSetup, icon: Users},
    {id: 3, title: 'Room & Screen Setup', component: Step3RoomSetup, icon: ListOrdered},
    {id: 4, title: 'Print Handouts', component: Step4PrintHandouts, icon: Printer},
    {id: 5, title: 'Finalize & Start', component: Step5Finalize, icon: Rocket},
];

const CreateGamePage: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [gameData, setGameData] = useState<NewGameData>(initialNewGameData);
    const [error, setError] = useState<string | null>(null);

    const {user} = useAuth();
    const navigate = useNavigate();

    // Enhanced mutation for creating game sessions
    const {
        execute: createGameSession,
        isLoading: isSubmitting,
        error: submissionError
    } = useSupabaseMutation(
        async (finalGameData: NewGameData) => {
            if (!user) {
                throw new Error("User not authenticated. Please log in again.");
            }

            // Create the session first
            const initialPhase = readyOrNotGame_2_0_DD.welcome_phases[0];
            const sessionToInsert = {
                name: finalGameData.name.trim() || `Game Session - ${new Date().toLocaleDateString()}`,
                teacher_id: user.id,
                class_name: finalGameData.class_name.trim() || null,
                grade_level: finalGameData.grade_level || null,
                game_version: finalGameData.game_version,
                current_phase_id: initialPhase?.id || null,
                current_slide_id_in_phase: initialPhase ? 0 : null,
                is_playing: false,
                is_complete: false,
                teacher_notes: {},
            };

            console.log("CreateGamePage: Creating session with data:", sessionToInsert);
            const newSession = await db.sessions.create(sessionToInsert);

            if (!newSession || !newSession.id) {
                throw new Error("Failed to create game session record (no data/ID returned).");
            }

            console.log("CreateGamePage: Session created successfully, ID:", newSession.id);

            // Create teams if configured
            const teamsToCreate = finalGameData.teams_config && Array.isArray(finalGameData.teams_config)
                ? finalGameData.teams_config
                : [];

            if (teamsToCreate.length > 0) {
                console.log("CreateGamePage: Creating teams:", teamsToCreate);

                // Create teams one by one using the enhanced database service
                for (const teamConfig of teamsToCreate) {
                    await db.teams.create({
                        session_id: newSession.id,
                        name: teamConfig.name,
                        passcode: teamConfig.passcode,
                    });
                }

                console.log(`CreateGamePage: ${teamsToCreate.length} teams created successfully.`);
            } else if (finalGameData.num_teams > 0) {
                // Fallback to creating default teams
                console.log(`CreateGamePage: Fallback - Creating ${finalGameData.num_teams} default teams.`);

                for (let i = 0; i < finalGameData.num_teams; i++) {
                    await db.teams.create({
                        session_id: newSession.id,
                        name: `Team ${String.fromCharCode(65 + i)}`,
                        passcode: Math.floor(1000 + Math.random() * 9000).toString(),
                    });
                }
            }

            return newSession;
        },
        {
            onSuccess: (newSession) => {
                console.log("CreateGamePage: Game setup complete. Navigating to classroom session:", newSession.id);
                navigate(`/classroom/${newSession.id}`);
            },
            onError: (error) => {
                console.error("CreateGamePage: Error in handleFinalizeGame:", error);
                setError(error);
            }
        }
    );

    useEffect(() => {
        if (!user) {
            navigate('/login', {replace: true});
        }
    }, [user, navigate]);

    // Update error state when submission error changes
    useEffect(() => {
        if (submissionError) {
            setError(submissionError);
        }
    }, [submissionError]);

    const handleNextStep = (dataFromStep?: Partial<NewGameData>) => {
        setError(null);
        if (dataFromStep) {
            console.log("CreateGamePage: Data from step", currentStep, dataFromStep);
            setGameData(prev => ({...prev, ...dataFromStep}));
        }
        if (currentStep < WIZARD_STEPS.length) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleFinalizeGame();
        }
    };

    const handlePreviousStep = () => {
        setError(null);
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        } else {
            navigate('/dashboard');
        }
    };

    const handleDataChange = (field: keyof NewGameData, value: NewGameData[keyof NewGameData]) => {
        console.log(`CreateGamePage: handleDataChange - Field: ${field}, Value:`, value);
        setGameData(prev => ({...prev, [field]: value}));
    };

    const handleFinalizeGame = async () => {
        if (!user) {
            setError("User not authenticated. Please log in again.");
            navigate('/login', {replace: true});
            return;
        }

        console.log("CreateGamePage: Finalizing game with data:", gameData);
        await createGameSession(gameData);
    };

    const CurrentStepComponent = WIZARD_STEPS[currentStep - 1].component;
    const CurrentStepIcon = WIZARD_STEPS[currentStep - 1].icon;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 md:p-8">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Zap size={32} className="text-blue-600 mr-3"/>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Create New Game</h1>
                                <p className="text-gray-500 text-sm mt-0.5">Set up your "Ready or Not" simulation.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={20} className="inline mr-1"/> Cancel & Back to Dashboard
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5 border-b border-gray-200 bg-slate-50 rounded-t-none">
                    <div className="flex justify-around items-start">
                        {WIZARD_STEPS.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <div className={`flex flex-col items-center text-center w-1/${WIZARD_STEPS.length} px-1`}>
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-1.5 transition-all duration-300
                                        ${currentStep === step.id ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-110' :
                                            currentStep > step.id ? 'bg-green-500 text-white border-green-600' :
                                                'bg-white border-gray-300 text-gray-400'}`}
                                    >
                                        {currentStep > step.id ? <CheckCircle size={20}/> : <step.icon size={18}/>}
                                    </div>
                                    <span className={`text-xs font-medium transition-colors duration-300 truncate w-full
                                    ${currentStep === step.id ? 'text-blue-700 font-semibold' :
                                        currentStep > step.id ? 'text-green-700' :
                                            'text-gray-500'}`}>
                                        {step.title}
                                    </span>
                                </div>
                                {index < WIZARD_STEPS.length - 1 && (
                                    <div
                                        className={`flex-1 h-0.5 mt-5 ${currentStep > step.id ? 'bg-green-500' : (currentStep === step.id + 1 ? 'bg-blue-200' : 'bg-gray-300')}`}/>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="flex items-center mb-6 text-gray-700">
                        <CurrentStepIcon size={22} className="text-blue-600 mr-2.5 flex-shrink-0"/>
                        <h2 className="text-xl md:text-2xl font-semibold">
                            {WIZARD_STEPS[currentStep - 1].title}
                        </h2>
                        <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                            Step {currentStep} of {WIZARD_STEPS.length}
                        </span>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm flex items-center">
                            <AlertTriangle size={18} className="mr-2 flex-shrink-0"/> {error}
                        </div>
                    )}

                    <CurrentStepComponent
                        gameData={gameData}
                        onDataChange={handleDataChange}
                        onNext={handleNextStep}
                        onPrevious={handlePreviousStep}
                        {...(currentStep === WIZARD_STEPS.length && {isSubmitting, onFinalize: handleFinalizeGame})}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreateGamePage;