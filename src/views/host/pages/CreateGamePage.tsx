// src/views/host/pages/CreateGamePage.tsx - Fixed draft session management
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {useAuth} from '@app/providers/AuthProvider';
import {GameSessionManager} from '@core/game/GameSessionManager';
import {NewGameData} from '@shared/types';
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
];

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

    // Track if user is intentionally leaving (not just refreshing)
    const isIntentionalNavigation = useRef(false);
    const beforeUnloadHandled = useRef(false);

    const sessionManager = GameSessionManager.getInstance();

    // Handle browser refresh/close - prevent draft deletion on refresh
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (draftSessionId && !isSubmitting) {
                // Store the draft session ID in sessionStorage so we can resume after refresh
                sessionStorage.setItem('ron_draft_session_id', draftSessionId);
                sessionStorage.setItem('ron_draft_wizard_data', JSON.stringify(gameData));
                sessionStorage.setItem('ron_draft_current_step', currentStep.toString());

                beforeUnloadHandled.current = true;

                // Show warning for browser close (but not refresh) - modern approach
                e.preventDefault();
                // Return empty string for modern browsers, they'll show their own dialog
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [draftSessionId, gameData, currentStep, isSubmitting]);

    // Initialize or resume draft session
    useEffect(() => {
        if (!user) {
            navigate('/login', {replace: true});
            return;
        }

        const initializeDraftSession = async () => {
            setIsLoading(true);
            setError(null);

            try {
                let draftSession;

                if (resumeSessionId) {
                    // Resume existing draft from URL parameter
                    console.log('Resuming draft session from URL:', resumeSessionId);
                    draftSession = await sessionManager.loadSession(resumeSessionId);

                    if ((draftSession as any).status !== 'draft') {
                        throw new Error('Session is not in draft status');
                    }

                    // Load saved wizard state
                    if ((draftSession as any).wizard_state) {
                        const savedState = (draftSession as any).wizard_state;
                        setGameData(prev => ({...prev, ...savedState}));
                        console.log('Loaded saved wizard state from database:', savedState);
                    }
                } else {
                    // Check for draft session from page refresh first
                    const storedDraftId = sessionStorage.getItem('ron_draft_session_id');
                    const storedWizardData = sessionStorage.getItem('ron_draft_wizard_data');
                    const storedCurrentStep = sessionStorage.getItem('ron_draft_current_step');

                    if (storedDraftId && storedWizardData) {
                        try {
                            console.log('Attempting to resume draft session from refresh:', storedDraftId);
                            // Try to load the stored draft session
                            draftSession = await sessionManager.loadSession(storedDraftId);

                            if ((draftSession as any).status === 'draft') {
                                console.log('Successfully resumed draft session from refresh');

                                // Restore wizard state from sessionStorage
                                const parsedWizardData = JSON.parse(storedWizardData);
                                setGameData(parsedWizardData);

                                if (storedCurrentStep) {
                                    setCurrentStep(parseInt(storedCurrentStep, 10));
                                }

                                // Clear the sessionStorage now that we've restored
                                sessionStorage.removeItem('ron_draft_session_id');
                                sessionStorage.removeItem('ron_draft_wizard_data');
                                sessionStorage.removeItem('ron_draft_current_step');
                            } else {
                                throw new Error('Stored session is not a draft');
                            }
                        } catch (refreshResumeError) {
                            console.warn('Could not resume from refresh, creating new draft:', refreshResumeError);
                            // Clear invalid sessionStorage
                            sessionStorage.removeItem('ron_draft_session_id');
                            sessionStorage.removeItem('ron_draft_wizard_data');
                            sessionStorage.removeItem('ron_draft_current_step');
                            // Fall through to create new draft
                            draftSession = null;
                        }
                    }

                    // Create new draft if we don't have one from refresh
                    if (!draftSession) {
                        console.log('Checking for existing draft sessions to clean up...');
                        const existingDraft = await sessionManager.getLatestDraftForTeacher(user.id);

                        if (existingDraft) {
                            console.log('Found existing draft session, cleaning up:', existingDraft.id);
                            try {
                                await sessionManager.deleteSession(existingDraft.id);
                                console.log('Cleaned up existing draft session');
                            } catch (cleanupError) {
                                console.warn('Failed to clean up existing draft, continuing with new draft:', cleanupError);
                            }
                        }

                        // Create new draft
                        console.log('Creating new draft session');
                        draftSession = await sessionManager.createDraftSession(user.id, readyOrNotGame_2_0_DD);
                    }
                }

                setDraftSessionId(draftSession.id);
                console.log('Draft session initialized:', draftSession.id);

            } catch (error) {
                console.error('Error initializing draft session:', error);
                setError(error instanceof Error ? error.message : 'Failed to initialize game session');
            } finally {
                setIsLoading(false);
            }
        };

        initializeDraftSession();
    }, [user, resumeSessionId, navigate, sessionManager]);

    // FIXED: Only cleanup draft session on intentional navigation, not refresh
    useEffect(() => {
        return () => {
            // Only clean up if:
            // 1. We have a draft session ID
            // 2. User is not in the middle of submitting
            // 3. This is NOT a page refresh (beforeUnload wasn't handled)
            // 4. User is intentionally navigating away
            if (draftSessionId && !isSubmitting && !beforeUnloadHandled.current && isIntentionalNavigation.current) {
                console.log('Component unmounting due to intentional navigation, cleaning up draft session:', draftSessionId);

                // Use a timeout to allow for navigation to complete
                setTimeout(async () => {
                    try {
                        const currentSession = await sessionManager.loadSession(draftSessionId);
                        // Only delete if it's still a draft (not finalized)
                        if ((currentSession as any).status === 'draft') {
                            await sessionManager.deleteSession(draftSessionId);
                            console.log('Cleaned up draft session on intentional navigation:', draftSessionId);
                        }
                    } catch (error) {
                        console.warn('Failed to cleanup draft session on navigation:', error);
                    }
                }, 100);
            }
        };
    }, [draftSessionId, isSubmitting, sessionManager]);

    // Handle data changes - NO automatic database saves
    const handleDataChange = useCallback((field: keyof NewGameData, value: NewGameData[keyof NewGameData]) => {
        console.log(`CreateGamePage: handleDataChange - Field: ${field}, Value:`, value);

        const updatedData = {...gameData, [field]: value};
        setGameData(updatedData);

        // Update sessionStorage for refresh persistence - FIX: Only store serializable data
        if (draftSessionId) {
            try {
                const serializableData = {
                    game_version: updatedData.game_version,
                    name: updatedData.name,
                    class_name: updatedData.class_name,
                    grade_level: updatedData.grade_level,
                    num_players: updatedData.num_players,
                    num_teams: updatedData.num_teams,
                    teams_config: updatedData.teams_config || []
                };
                sessionStorage.setItem('ron_draft_wizard_data', JSON.stringify(serializableData));
            } catch (error) {
                console.error('CreateGamePage: Error saving data change to sessionStorage:', error);
            }
        }
    }, [gameData, draftSessionId]);

    // Handle wizard navigation - SAVE TO DATABASE HERE (FIXED)
    const handleNextStep = (dataFromStep?: Partial<NewGameData>) => {
        console.log('CreateGamePage: handleNextStep called, current step:', currentStep);
        setError(null);

        let finalData = gameData;
        if (dataFromStep) {
            console.log("CreateGamePage: Data from step", currentStep, dataFromStep);
            finalData = {...gameData, ...dataFromStep};
            setGameData(finalData);
        }

        const newStep = currentStep + 1;
        console.log('CreateGamePage: Advancing to step:', newStep);

        // Save to database when moving to next step - FIXED: Only save serializable data
        if (draftSessionId) {
            try {
                // Create a clean copy of finalData with only serializable properties
                const serializableData = {
                    game_version: finalData.game_version,
                    name: finalData.name,
                    class_name: finalData.class_name,
                    grade_level: finalData.grade_level,
                    num_players: finalData.num_players,
                    num_teams: finalData.num_teams,
                    teams_config: finalData.teams_config || []
                };

                console.log('CreateGamePage: Saving wizard state to database...');
                sessionManager.updateWizardState(draftSessionId, serializableData).catch(error => {
                    console.error('Error saving wizard state (non-blocking):', error);
                    // Don't block navigation on save error - just log it
                });

                // Update sessionStorage with the same clean data
                sessionStorage.setItem('ron_draft_wizard_data', JSON.stringify(serializableData));
                sessionStorage.setItem('ron_draft_current_step', newStep.toString());
                console.log('CreateGamePage: Successfully saved to database and sessionStorage');
            } catch (error) {
                console.error('CreateGamePage: Error preparing data for save:', error);
                // Don't block navigation on preparation error
            }
        }

        if (currentStep < WIZARD_STEPS.length) {
            console.log('CreateGamePage: Setting current step to:', newStep);
            setCurrentStep(newStep);
            console.log('CreateGamePage: State update called, should re-render with step:', newStep);
        } else {
            console.log('CreateGamePage: Already at last step, not advancing');
        }
    };

    const handlePreviousStep = () => {
        setError(null);
        if (currentStep > 1) {
            const newStep = currentStep - 1;
            setCurrentStep(newStep);

            // Update sessionStorage
            if (draftSessionId) {
                sessionStorage.setItem('ron_draft_current_step', newStep.toString());
            }
        } else {
            handleCancel(); // Use the same cancel logic when going back from step 1
        }
    };

    // Handle game finalization
    const handleFinalizeGame = async () => {
        if (!user || !draftSessionId) {
            setError("No draft session available to finalize");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            console.log("CreateGamePage: Finalizing game with data:", gameData);

            // Clear sessionStorage since we're finalizing
            sessionStorage.removeItem('ron_draft_session_id');
            sessionStorage.removeItem('ron_draft_wizard_data');
            sessionStorage.removeItem('ron_draft_current_step');

            // Finalize the draft session
            const finalizedSession = await sessionManager.finalizeDraftSession(draftSessionId, gameData);

            console.log("CreateGamePage: Game finalized successfully:", finalizedSession.id);

            // Mark as intentional navigation since we're going to classroom
            isIntentionalNavigation.current = false; // Don't clean up since it's finalized
            navigate(`/classroom/${finalizedSession.id}`);

        } catch (error) {
            console.error("CreateGamePage: Error finalizing game:", error);
            setError(error instanceof Error ? error.message : 'Failed to finalize game');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Enhanced cancellation with proper cleanup and UI feedback
    const handleCancel = async () => {
        setIsCancelling(true);
        setError(null);
        isIntentionalNavigation.current = true; // Mark as intentional

        try {
            if (draftSessionId) {
                console.log('Deleting draft session before cancel:', draftSessionId);
                await sessionManager.deleteSession(draftSessionId);
                console.log('Draft session deleted successfully:', draftSessionId);

                // Clear the draft session ID and sessionStorage
                setDraftSessionId(null);
                sessionStorage.removeItem('ron_draft_session_id');
                sessionStorage.removeItem('ron_draft_wizard_data');
                sessionStorage.removeItem('ron_draft_current_step');
            }

            // Navigate to dashboard and force a complete refresh
            navigate('/dashboard', {
                replace: true,
                state: {forceRefresh: true, deletedDraftId: draftSessionId}
            });

        } catch (error) {
            console.error('Error deleting draft session during cancel:', error);
            // Still navigate to dashboard even if deletion fails
            navigate('/dashboard', {
                replace: true,
                state: {forceRefresh: true, deletedDraftId: draftSessionId}
            });
        } finally {
            setIsCancelling(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                <p className="mt-4 text-gray-600">
                    {resumeSessionId ? 'Loading draft session...' : 'Initializing game creator...'}
                </p>
            </div>
        );
    }

    // Error state
    if (error && !draftSessionId) {
        return (
            <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-xl max-w-md text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4"/>
                    <h2 className="text-xl font-bold text-red-700 mb-2">Initialization Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-blue-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const CurrentStepComponent = WIZARD_STEPS[currentStep - 1].component;
    const CurrentStepIcon = WIZARD_STEPS[currentStep - 1].icon;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 md:p-8">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Zap size={32} className="text-blue-600 mr-3"/>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                                    {resumeSessionId ? 'Resume Game Creation' : 'Create New Game'}
                                </h1>
                                <p className="text-gray-500 text-sm mt-0.5">
                                    {resumeSessionId ? 'Continue setting up your "Ready or Not" simulation.' : 'Set up your "Ready or Not" simulation.'}
                                </p>
                                {draftSessionId && (
                                    <p className="text-xs text-blue-600 mt-1 font-mono">
                                        Session ID: {draftSessionId.substring(0, 8)}...
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="px-6 py-5 border-b border-gray-200 bg-slate-50 rounded-t-none">
                    <div className="flex justify-around items-start">
                        {WIZARD_STEPS.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <div
                                    className={`flex flex-col items-center text-center w-1/${WIZARD_STEPS.length} px-1`}>
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

                {/* Main Content */}
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
                        <div
                            className="mb-4 p-3 bg-red-100 text-red-700 border border-red-200 rounded-md text-sm flex items-center">
                            <AlertTriangle size={18} className="mr-2 flex-shrink-0"/> {error}
                        </div>
                    )}

                    <CurrentStepComponent
                        gameData={gameData}
                        onDataChange={handleDataChange}
                        onNext={handleNextStep}
                        onPrevious={handlePreviousStep}
                        draftSessionId={draftSessionId} // Pass draft session ID to components that need it
                        {...(currentStep === WIZARD_STEPS.length && {
                            isSubmitting,
                            onFinalize: handleFinalizeGame
                        })}
                    />
                </div>
            </div>
        </div>
    );
};

export default CreateGamePage;
