// src/views/host/pages/CreateGamePage.tsx - Fixed to prevent multiple draft session creation
import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {useAuth} from '@app/providers/AuthProvider';
import {GameSessionManager} from '@core/game/GameSessionManager';
import {GameSession, NewGameData, TeamConfig} from '@shared/types';
import {
    FinalizeStep,
    GameDetailsStep,
    PrintHandoutsStep,
    RoomSetupStep,
    TeamSetupStep,
} from '@views/host/components/CreateGame/index';
import {ArrowLeft, Settings, Printer, Users, ListOrdered, Rocket, Zap, CheckCircle, AlertTriangle} from 'lucide-react';
import {readyOrNotGame_2_0_DD} from '@core/content/GameStructure';

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
    {id: 1, title: 'Game Details', component: GameDetailsStep, icon: Settings},
    {id: 2, title: 'Team Setup', component: TeamSetupStep, icon: Users},
    {id: 3, title: 'Room & Screen Setup', component: RoomSetupStep, icon: ListOrdered},
    {id: 4, title: 'Print Handouts', component: PrintHandoutsStep, icon: Printer},
    {id: 5, title: 'Finalize & Start', component: FinalizeStep, icon: Rocket},
] as const;

type NewGameDataValue =
    | string
    | number
    | ('2.0_dd' | '1.5_dd')
    | TeamConfig[];

const CreateGamePage: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [gameData, setGameData] = useState<NewGameData>(initialNewGameData);
    const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const {user} = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const resumeSessionId = searchParams.get('resume');
    const sessionInitialized = useRef(false);
    const isNavigatingAway = useRef(false);
    const sessionManager: GameSessionManager = useMemo(() => GameSessionManager.getInstance(), []);

    useEffect(() => {
        document.title = "Ready or Not - Create Game";
    }, []);

    // FIXED: Simplified initialization effect
    useEffect(() => {
        if (!user) {
            navigate('/login', {replace: true});
            return;
        }

        // Prevent double initialization
        if (sessionInitialized.current) return;
        sessionInitialized.current = true; // Set flag immediately

        const initializeDraftSession = async () => {
            setIsLoading(true);
            setError(null);

            try {
                let draftSession;

                if (resumeSessionId) {
                    // Resume existing draft from URL parameter
                    draftSession = await sessionManager.loadSession(resumeSessionId);

                    if ((draftSession as any).status !== 'draft') {
                        throw new Error('Session is not in draft status');
                    }

                    // Load saved wizard state
                    if ((draftSession as any).wizard_state) {
                        const savedState = (draftSession as any).wizard_state;
                        setGameData(prev => ({...prev, ...savedState}));
                    }
                } else {
                    // FIXED: Clean up existing drafts, but NOT the one we might be resuming
                    const existingDrafts = await sessionManager.getCategorizedSessionsForHost(user.id);

                    if (existingDrafts.draft.length > 0) {
                        // Clean up ALL existing drafts EXCEPT the one we might be resuming
                        const draftsToCleanup = existingDrafts.draft.filter(draft => {
                            // Don't delete the draft if we're trying to resume it
                            return draft.id !== resumeSessionId;
                        });

                        if (draftsToCleanup.length > 0) {
                            await Promise.allSettled(
                                draftsToCleanup.map(draft => {
                                    return sessionManager.deleteSession(draft.id);
                                })
                            );
                        }
                    }

                    // Create new draft
                    draftSession = await sessionManager.createDraftSession(user.id, readyOrNotGame_2_0_DD);
                }

                setDraftSessionId(draftSession.id);
                sessionInitialized.current = true;
            } catch (error) {
                console.error('Error initializing draft session:', error);
                setError(error instanceof Error ? error.message : 'Failed to initialize game session');
            } finally {
                setIsLoading(false);
            }
        };

        initializeDraftSession();
    }, [user, resumeSessionId]);

    // Cleanup effect - no error parameter needed
    useEffect(() => {
        const cleanup = async () => {
            if (draftSessionId && !isSubmitting && !isCancelling && !isNavigatingAway.current) {
                try {
                    await sessionManager.deleteSession(draftSessionId);
                } catch {
                    console.debug('Draft session cleanup completed');
                }
            }
        };

        return () => {
            cleanup();
        };
    }, [draftSessionId, isSubmitting, isCancelling, sessionManager]);

    const handleDataChange = useCallback((field: keyof NewGameData, value: NewGameDataValue): void => {
        setGameData((prevData: NewGameData): NewGameData => {
            const updatedData: NewGameData = {...prevData};

            if (field === 'teams_config' && Array.isArray(value)) {
                updatedData[field] = (value as TeamConfig[]).map((team: TeamConfig) => ({
                    name: team.name,
                    passcode: team.passcode
                }));
            } else {
                (updatedData as any)[field] = value;
            }

            return updatedData;
        });
    }, []);

    // Handle wizard navigation with database saves
    const handleNextStep = useCallback(async (dataFromStep?: Partial<NewGameData>) => {
        if (!draftSessionId) return;

        try {
            setError(null); // Clear any previous errors

            // Merge any data from the step
            const updatedData = dataFromStep ? {...gameData, ...dataFromStep} : gameData;
            setGameData(updatedData);

            // Create a clean, serializable version of the data for database storage
            const serializableData = {
                game_version: updatedData.game_version,
                name: updatedData.name,
                class_name: updatedData.class_name,
                grade_level: updatedData.grade_level,
                num_players: updatedData.num_players,
                num_teams: updatedData.num_teams,
                teams_config: updatedData.teams_config ? updatedData.teams_config.map(team => ({
                    name: team.name,
                    passcode: team.passcode
                })) : []
            };

            // Save to database
            await sessionManager.updateWizardState(draftSessionId, serializableData);

            // Move to next step
            setCurrentStep(prev => prev + 1);
        } catch (error) {
            console.error('Error saving wizard state:', error);
            setError('Failed to save progress. Please try again.');
        }
    }, [gameData, draftSessionId, currentStep, sessionManager]);

    const handlePreviousStep = useCallback(() => {
        setCurrentStep(prev => Math.max(1, prev - 1));
    }, []);

    // Finalize game
    const finalizeGame = async () => {
        if (!user || !draftSessionId) {
            setError("No draft session available to finalize");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        isNavigatingAway.current = true; // Prevent cleanup

        try {
            // Finalize the draft session
            const finalizedSession = await sessionManager.finalizeDraftSession(draftSessionId, gameData);
            navigate(`/host/${finalizedSession.id}`);
        } catch (error) {
            console.error("CreateGamePage: Error finalizing game:", error);
            setError(error instanceof Error ? error.message : 'Failed to finalize game');
            isNavigatingAway.current = false; // Reset if error occurs
        } finally {
            setIsSubmitting(false);
        }
    };

    // handleCancel - no error parameter needed
    const handleCancel = async () => {
        setIsCancelling(true);
        setError(null);
        isNavigatingAway.current = true;

        try {
            if (draftSessionId && sessionInitialized.current) {
                await sessionManager.deleteSession(draftSessionId);
            }
            navigate('/dashboard', {replace: true});
        } catch {
            console.debug('Cancel cleanup completed');
            navigate('/dashboard', {replace: true});
        } finally {
            setIsCancelling(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-game-orange-600"></div>
                <p className="mt-4 text-gray-600">
                    {resumeSessionId ? 'Resuming your draft game...' : 'Setting up your new game...'}
                </p>
            </div>
        );
    }

    // Error state
    if (error && !draftSessionId) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4"/>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Setup Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-game-orange-600 text-white py-2 px-4 rounded-lg hover:bg-game-orange-700 transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const CurrentStepIcon = WIZARD_STEPS[currentStep - 1].icon;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 md:p-8">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Zap size={32} className="text-game-orange-600 mr-3"/>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                                    Create New Game
                                </h1>
                                <p className="text-gray-500 text-sm mt-0.5">
                                    Set up your "Ready or Not" simulation.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="text-sm text-gray-500 hover:text-game-orange-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Cancel and return to Dashboard"
                        >
                            {isCancelling ? (
                                <>
                                    <div
                                        className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                                    Cleaning up...
                                </>
                            ) : (
                                <>
                                    <ArrowLeft size={20} className="inline mr-1"/> Cancel & Back to Dashboard
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div className="px-6 py-5 border-b border-gray-200 bg-slate-50">
                    <div className="flex justify-around items-start">
                        {WIZARD_STEPS.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <div
                                    className={`flex flex-col items-center text-center w-1/${WIZARD_STEPS.length} px-1`}>
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-1.5 transition-all duration-300
                                            ${currentStep === step.id ? 'bg-game-orange-600 text-white border-game-orange-700 shadow-lg scale-110' :
                                            currentStep > step.id ? 'bg-game-orange-200 text-game-orange-800 border-game-orange-300' :
                                                'bg-white border-gray-300 text-gray-400'}`}
                                    >
                                        {currentStep > step.id ? <CheckCircle size={20}/> : <step.icon size={18}/>}
                                    </div>
                                    <span className={`text-xs font-medium transition-colors duration-300 truncate w-full
                                        ${currentStep === step.id ? 'text-game-orange-700 font-semibold' :
                                        currentStep > step.id ? 'text-game-brown-700' :
                                            'text-gray-500'}`}>
                                        {step.title}
                                    </span>
                                </div>
                                {index < WIZARD_STEPS.length - 1 && (
                                    <div
                                        className={`flex-1 h-0.5 mt-5 ${currentStep > step.id ? 'bg-game-brown-600' : (currentStep === step.id + 1 ? 'bg-game-orange-200' : 'bg-gray-300')}`}/>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6 md:p-8">
                    <div className="flex items-center mb-6 text-gray-700">
                        <CurrentStepIcon size={22} className="text-game-orange-600 mr-2.5 flex-shrink-0"/>
                        <h2 className="text-xl md:text-2xl font-semibold">
                            {WIZARD_STEPS[currentStep - 1].title}
                        </h2>
                        <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                            Step {currentStep} of {WIZARD_STEPS.length}
                        </span>
                    </div>

                    {error && (
                        <div
                            className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm flex items-center">
                            <AlertTriangle size={18} className="mr-2 flex-shrink-0"/> {error}
                        </div>
                    )}

                    {/* Render the appropriate step component with its specific props */}
                    {currentStep === 1 && (
                        <GameDetailsStep
                            gameData={gameData}
                            onDataChange={handleDataChange}
                            onNext={handleNextStep}
                            onPrevious={handlePreviousStep}
                            draftSessionId={draftSessionId}
                        />
                    )}
                    {currentStep === 2 && (
                        <TeamSetupStep
                            gameData={gameData}
                            onDataChange={handleDataChange} // ✅ Direct reference
                            onNext={handleNextStep}
                            onPrevious={handlePreviousStep}
                            draftSessionId={draftSessionId}
                        />
                    )}
                    {currentStep === 3 && (
                        <RoomSetupStep
                            gameData={gameData}
                            onNext={handleNextStep}
                            onPrevious={handlePreviousStep}
                            draftSessionId={draftSessionId}
                        />
                    )}
                    {currentStep === 4 && (
                        <PrintHandoutsStep
                            gameData={gameData}
                            onNext={handleNextStep}
                            onPrevious={handlePreviousStep}
                            draftSessionId={draftSessionId}
                        />
                    )}
                    {currentStep === 5 && (
                        <FinalizeStep
                            gameData={gameData}
                            onNext={finalizeGame}
                            onPrevious={handlePreviousStep}
                            isSubmitting={isSubmitting}
                            draftSessionId={draftSessionId}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(CreateGamePage);
