// src/app/providers/AuthProvider.tsx - Back to working basics with performance fixes
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {auth, User} from '@shared/services/supabase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = React.memo(({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const session = await auth.getSession();
                setUser(session?.user ?? null);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Set up auth state change listener - simplified like original
        const {data: {subscription}} = auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                setUser(session?.user ?? null);
                setError(null);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setError(null);
            } else if (event === 'TOKEN_REFRESHED') {
                setUser(session?.user ?? null);
                setError(null);
            } else if (event === 'INITIAL_SESSION') {
                setUser(session?.user ?? null);
                setError(null);
            }
            // Always set loading false for any auth event (like original)
            setLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []); // Empty dependency array

    const signIn = useCallback(async (email: string, password: string) => {
        try {
            setError(null);
            setLoading(true);
            await auth.signIn(email, password);
            // Success handled by onAuthStateChange
        } catch (err) {
            console.error('[AuthProvider] Sign in error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
            setError(errorMessage);
            setLoading(false);
            throw err;
        }
    }, []);

    const signUp = useCallback(async (email: string, password: string) => {
        try {
            setError(null);
            setLoading(true);
            await auth.signUp(email, password);
            // Success handled by onAuthStateChange
        } catch (err) {
            console.error('[AuthProvider] Sign up error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
            setError(errorMessage);
            setLoading(false);
            throw err;
        }
    }, []);

    const signOut = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            await auth.signOut();
            // Success handled by onAuthStateChange
        } catch (err) {
            console.error('[AuthProvider] Sign out error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
            setError(errorMessage);
            setLoading(false);
            throw err;
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Optimized context value - functions are stable via useCallback
    const value: AuthContextType = useMemo(() => {
        return {
            user,
            loading,
            error,
            signIn,
            signUp,
            signOut,
            clearError
        };
    }, [user, loading, error, signIn, signUp, signOut, clearError]); // Include all values

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
});

AuthProvider.displayName = 'AuthProvider';
