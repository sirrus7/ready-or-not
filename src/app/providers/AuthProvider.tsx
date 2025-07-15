// src/app/providers/AuthProvider.tsx
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    console.log('🔍 [AUTHPROVIDER] Component re-rendering');
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('🏗️ [AUTHPROVIDER] COMPONENT MOUNTED');
        return () => {
            console.log('💀 [AUTHPROVIDER] COMPONENT UNMOUNTED');
        };
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const session = await auth.getSession();
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
            // Only log in development for critical auth state changes
            if (import.meta.env.DEV && (event === 'SIGNED_OUT' || event === 'SIGNED_IN')) {
                console.warn('[AuthProvider] Auth state change:', event);
            }

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
            subscription?.unsubscribe();
        };
    }, []);

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
            throw err;
        } finally {
            setLoading(false);
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
            throw err;
        } finally {
            setLoading(false);
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
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: AuthContextType = useMemo(() => ({
        user,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        clearError
    }), [user, loading, error, signIn, signUp, signOut, clearError]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
