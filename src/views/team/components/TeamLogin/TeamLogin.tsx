// src/views/team/components/TeamLogin/TeamLogin.tsx
// COMPREHENSIVE VERSION - Fully documented main login component

/**
 * ============================================================================
 * TEAM LOGIN MAIN COMPONENT
 * ============================================================================
 *
 * ARCHITECTURAL REQUIREMENTS:
 * 1. Mobile-first responsive design (primary access via phones/tablets)
 * 2. Professional visual design matching application branding
 * 3. Robust error handling and user feedback
 * 4. Connection status monitoring and display
 * 5. Accessibility compliance (WCAG 2.1 AA standards)
 * 6. Loading states and smooth transitions
 * 7. Card-based layout with clear visual hierarchy
 * 8. Cross-browser compatibility
 *
 * USER EXPERIENCE GOALS:
 * - Simple, intuitive login process
 * - Clear feedback for all user actions
 * - Professional appearance that builds confidence
 * - Fast loading and responsive interactions
 * - Graceful error recovery and guidance
 *
 * TECHNICAL IMPLEMENTATION:
 * - React functional component with hooks
 * - Custom validation system (no browser defaults)
 * - Real-time connection monitoring
 * - Modular component architecture for maintainability
 * - TypeScript for type safety and developer experience
 *
 * RESPONSIVE DESIGN STRATEGY:
 * - Mobile-first CSS with progressive enhancement
 * - Touch-friendly interactive elements (44px minimum)
 * - Flexible layout that works on all screen sizes
 * - Optimized typography for readability on small screens
 * - Proper spacing and visual hierarchy on all devices
 * ============================================================================
 */

import React from 'react';
import {Users, Wifi, WifiOff} from 'lucide-react';
import {useSupabaseConnection} from '@shared/services/supabase';
import {useTeamLogin} from '@views/team/hooks/useTeamLogin';
import ConnectionError from "./ConnectionError"
import LoadingState from './LoadingState';
import ErrorDisplay from './ErrorDisplay';
import LoginForm from './LoginForm';
import NoTeamsMessage from './NoTeamsMessage';

interface TeamLoginProps {
    sessionId: string;
    onLoginSuccess: (teamId: string, teamName: string) => void;
}

const TeamLogin: React.FC<TeamLoginProps> = ({sessionId, onLoginSuccess}) => {

    // ========================================================================
    // CONNECTION MONITORING
    // Real-time monitoring of database connection status
    // Provides user feedback about connectivity issues
    // ========================================================================
    const connection = useSupabaseConnection();

    // ========================================================================
    // LOGIN STATE MANAGEMENT
    // Handles all login-related state and business logic
    // Centralizes team fetching, validation, and authentication
    // ========================================================================
    const {
        availableTeams,
        isLoadingTeams,
        teamsError,
        refetchTeams,
        selectedTeamId,
        setSelectedTeamId,
        passcode,
        setPasscode,
        isLoggingIn,
        loginError,
        handleLogin
    } = useTeamLogin({sessionId, onLoginSuccess});

    // ========================================================================
    // CRITICAL ERROR HANDLING
    // Show connection error prominently if database is unreachable
    // Prevents user frustration with non-functional login form
    // ========================================================================
    if (connection.status === 'error' && !connection.isConnected) {
        return <ConnectionError connection={connection}/>;
    }

    // ========================================================================
    // MAIN COMPONENT RENDER
    // Card-based layout with clear visual hierarchy
    // Mobile-optimized spacing and typography
    // ========================================================================
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            {/*
                MAIN LOGIN CONTAINER
                - Centered card layout works on all screen sizes
                - Maximum width prevents stretching on large screens
                - Proper padding for touch-friendly mobile experience
            */}
            <div className="w-full max-w-md">
                <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">

                    {/*
                        HEADER SECTION
                        - Eye-catching gradient background
                        - Clear branding and purpose communication
                        - Professional visual hierarchy
                        - Consistent with application design language
                    */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-center">
                        {/* Application icon with subtle background */}
                        <div className="flex justify-center mb-4">
                            <div className="bg-white/10 p-3 rounded-full">
                                <Users size={32} className="text-white" aria-hidden="true"/>
                            </div>
                        </div>

                        {/* Primary heading */}
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Team Login
                        </h1>

                        {/* Descriptive subtitle */}
                        <p className="text-blue-100 text-sm opacity-90">
                            Select your team and enter the passcode provided by your facilitator.
                        </p>
                    </div>

                    {/*
                        CONTENT SECTION
                        - Houses all dynamic content (forms, errors, loading states)
                        - Consistent padding for visual balance
                        - Flexible height accommodates different content states
                    */}
                    <div className="px-6 py-6">

                        {/*
                            LOADING STATE
                            - Shown while fetching available teams from database
                            - Prevents user confusion during data loading
                            - Professional spinner animation with descriptive text
                        */}
                        {isLoadingTeams && (
                            <div className="text-center py-8">
                                <LoadingState message="Loading available teams..."/>
                            </div>
                        )}

                        {/*
                            ERROR DISPLAY
                            - Handles both login errors and team fetching errors
                            - Provides clear error messages and recovery options
                            - Non-blocking - allows user to retry without page refresh
                        */}
                        {(loginError || teamsError) && (
                            <div className="mb-6">
                                <ErrorDisplay
                                    loginError={loginError}
                                    teamsError={teamsError}
                                    onRetry={refetchTeams}
                                />
                            </div>
                        )}

                        {/*
                            MAIN LOGIN FORM
                            - Only shown when teams are loaded successfully
                            - Comprehensive validation and error handling
                            - Mobile-optimized inputs and interactions
                            - Professional custom styling throughout
                        */}
                        {!isLoadingTeams && availableTeams.length > 0 && !teamsError && (
                            <LoginForm
                                availableTeams={availableTeams}
                                selectedTeamId={selectedTeamId}
                                setSelectedTeamId={setSelectedTeamId}
                                passcode={passcode}
                                setPasscode={setPasscode}
                                onSubmit={handleLogin}
                                isLoggingIn={isLoggingIn}
                                isLoadingTeams={isLoadingTeams}
                            />
                        )}

                        {/*
                            NO TEAMS AVAILABLE MESSAGE
                            - Handles edge case where session has no teams
                            - Provides helpful guidance and retry option
                            - Suggests checking with facilitator
                        */}
                        {!isLoadingTeams && availableTeams.length === 0 && !teamsError && (
                            <div className="text-center py-8">
                                <NoTeamsMessage sessionId={sessionId} onRefresh={refetchTeams}/>
                            </div>
                        )}
                    </div>

                    {/*
                        FOOTER SECTION
                        - Contains session information and connection status
                        - Subtle background separation from main content
                        - Important debugging information for support
                        - Connection status for troubleshooting
                    */}
                    <div className="bg-gray-700/50 px-6 py-4 border-t border-gray-600">
                        {/*
                            SESSION IDENTIFICATION
                            - Displays current session ID for reference
                            - Monospace font for technical readability
                            - Helps with troubleshooting and support
                        */}
                        <div className="text-center mb-3">
                            <p className="text-xs text-gray-400">
                                Session ID: <span className="font-mono text-gray-300">{sessionId}</span>
                            </p>
                        </div>

                        {/*
                            REAL-TIME CONNECTION STATUS
                            - Visual indicator of database connectivity
                            - Green = connected, Red = disconnected
                            - Helps users understand if issues are connectivity-related
                            - Icons provide quick visual reference
                        */}
                        <div className="flex items-center justify-center gap-2">
                            {connection.isConnected ? (
                                <>
                                    <Wifi size={14} className="text-green-400" aria-hidden="true"/>
                                    <span className="text-xs text-green-400 font-medium">Connected</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff size={14} className="text-red-400" aria-hidden="true"/>
                                    <span className="text-xs text-red-400 font-medium">
                                        {connection.status === 'connecting' ? 'Connecting...' : 'Disconnected'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/*
                    APPLICATION BRANDING
                    - Reinforces application identity
                    - Provides context about the educational nature
                    - Positioned outside main card for subtle presence
                    - Consistent typography and spacing
                */}
                <div className="text-center mt-6">
                    <h2 className="text-xl font-bold text-white mb-1">Ready or Not</h2>
                    <p className="text-gray-400 text-sm">Educational Business Simulation</p>
                </div>
            </div>
        </div>
    );
};

export default TeamLogin;
