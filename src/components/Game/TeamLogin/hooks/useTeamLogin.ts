// src/components/Game/TeamLogin/hooks/useTeamLogin.ts - Main login logic
import { useState, useEffect } from 'react';
import { db } from '../../../../utils/supabase';
import { useSupabaseQuery } from '../../../../hooks/supabase';

interface UseTeamLoginProps {
    sessionId: string;
    onLoginSuccess: (teamId: string, teamName: string) => void;
}

interface UseTeamLoginReturn {
    // Team data
    availableTeams: any[];
    isLoadingTeams: boolean;
    teamsError: string | null;
    refetchTeams: () => Promise<any[] | null>;

    // Login form state
    selectedTeamId: string;
    setSelectedTeamId: (id: string) => void;
    passcode: string;
    setPasscode: (code: string) => void;

    // Login process
    isLoggingIn: boolean;
    loginError: string;
    handleLogin: (e: React.FormEvent) => Promise<void>;
}

export const useTeamLogin = ({ sessionId, onLoginSuccess }: UseTeamLoginProps): UseTeamLoginReturn => {
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [passcode, setPasscode] = useState<string>('');
    const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
    const [loginError, setLoginError] = useState<string>('');

    // Fetch available teams
    const {
        data: availableTeamsData,
        isLoading: isLoadingTeams,
        error: teamsError,
        refresh: refetchTeams
    } = useSupabaseQuery(
        () => db.teams.getBySession(sessionId),
        [sessionId],
        {
            cacheKey: `teams-${sessionId}`,
            cacheTimeout: 2 * 60 * 1000, // 2 minutes
            retryOnError: true,
            maxRetries: 2,
            onError: (error) => {
                console.error("[useTeamLogin] Error fetching teams:", error);
            }
        }
    );

    // Safely handle teams data
    const availableTeams = availableTeamsData || [];

    // Set initial team selection when teams load
    useEffect(() => {
        if (availableTeams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(availableTeams[0].id);
        }
    }, [availableTeams, selectedTeamId]);

    // Handle login submission
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedTeamId) {
            setLoginError('Please select a team.');
            return;
        }

        if (!passcode.trim()) {
            setLoginError('Please enter the team passcode.');
            return;
        }

        setIsLoggingIn(true);
        setLoginError('');

        try {
            const verifiedTeam = await db.teams.verifyLogin(
                selectedTeamId,
                sessionId,
                passcode.trim()
            );

            if (verifiedTeam) {
                onLoginSuccess(verifiedTeam.id, verifiedTeam.name);
            } else {
                setLoginError('Incorrect passcode or invalid team for this session.');
            }
        } catch (err) {
            console.error("[useTeamLogin] Login error:", err);
            setLoginError(`Login failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return {
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
    };
};
