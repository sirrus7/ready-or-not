// src/app/providers/AuthProvider.tsx
import React, {createContext, useContext, useEffect, useState} from 'react';
import {User} from '@supabase/supabase-js';
import {auth} from '@shared/services/supabase';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                console.log('[AuthProvider] Initializing auth...');
                const session = await auth.getSession();

                console.log('[AuthProvider] Session loaded:', !!session);
                setUser(session?.user ?? null);
                setError(null);
            } catch (err) {
                console.error('[AuthProvider] Exception getting session:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Set up auth state change listener
        const {data: {subscription}} = auth.onAuthStateChange((event, session) => {
            console.log('[AuthProvider] Auth state change:', event, !!session);

            if (event === 'SIGNED_IN') {
                setUser(session?.user ?? null);
                setError(null);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setError(null);
            } else if (event === 'TOKEN_REFRESHED') {
                setUser(session?.user ?? null);
                setError(null);
            }

            setLoading(false);
        });

        return () => {
            console.log('[AuthProvider] Cleaning up auth subscription');
            subscription?.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            setError(null);
            setLoading(true);
            console.log('[AuthProvider] Attempting sign in for:', email);

            await auth.signIn(email, password);
            console.log('[AuthProvider] Sign in successful');

            // Don't manually set user here - let the onAuthStateChange handle it
        } catch (err) {
            console.error('[AuthProvider] Sign in error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email: string, password: string) => {
        try {
            setError(null);
            setLoading(true);
            console.log('[AuthProvider] Attempting sign up for:', email);

            await auth.signUp(email, password);
            console.log('[AuthProvider] Sign up successful');

            // Don't manually set user here - let the onAuthStateChange handle it
        } catch (err) {
            console.error('[AuthProvider] Sign up error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setError(null);
            setLoading(true);
            console.log('[AuthProvider] Attempting sign out');

            await auth.signOut();
            console.log('[AuthProvider] Sign out successful');

            // Don't manually set user here - let the onAuthStateChange handle it
        } catch (err) {
            console.error('[AuthProvider] Sign out error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => {
        setError(null);
    };

    const value = {
        user,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        clearError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
