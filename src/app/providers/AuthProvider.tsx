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
        console.log('🔍 [AUTHPROVIDER] Setting up auth initialization and listener');

        const initializeAuth = async () => {
            try {
                console.log('🔍 [AUTHPROVIDER] Getting initial session...');
                const session = await auth.getSession();
                console.log('🔍 [AUTHPROVIDER] Initial session result:', session?.user?.id || 'no user');
                setUser(session?.user ?? null);
                setError(null);
            } catch (err) {
                console.error('[AuthProvider] Exception getting session:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
                setUser(null);
            } finally {
                console.log('🔍 [AUTHPROVIDER] Setting loading false after init');
                setLoading(false);
            }
        };

        initializeAuth();

        // Set up auth state change listener - simplified like original
        console.log('🔍 [AUTHPROVIDER] Setting up auth state listener');
        const {data: {subscription}} = auth.onAuthStateChange((event, session) => {
            console.log(`🔍 [AUTHPROVIDER] Auth state change: ${event}, user: ${session?.user?.id || 'none'}`);

            if (event === 'SIGNED_IN') {
                console.log('🔍 [AUTHPROVIDER] Processing SIGNED_IN');
                setUser(session?.user ?? null);
                setError(null);
            } else if (event === 'SIGNED_OUT') {
                console.log('🔍 [AUTHPROVIDER] Processing SIGNED_OUT');
                setUser(null);
                setError(null);
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('🔍 [AUTHPROVIDER] Processing TOKEN_REFRESHED');
                setUser(session?.user ?? null);
                setError(null);
            } else if (event === 'INITIAL_SESSION') {
                console.log('🔍 [AUTHPROVIDER] Processing INITIAL_SESSION');
                setUser(session?.user ?? null);
                setError(null);
            }

            // Always set loading false for any auth event (like original)
            setLoading(false);
        });

        return () => {
            console.log('🔍 [AUTHPROVIDER] Cleaning up auth listener');
            subscription?.unsubscribe();
        };
    }, []); // Empty dependency array

    const signIn = useCallback(async (email: string, password: string) => {
        console.log('🔍 [AUTHPROVIDER] signIn called with email:', email);
        try {
            setError(null);
            setLoading(true);
            const data = await auth.signIn(email, password);
            console.log('🔍 [AUTHPROVIDER] Sign in successful:', data.user?.id);
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
        console.log('🔍 [AUTHPROVIDER] signUp called with email:', email);
        try {
            setError(null);
            setLoading(true);
            const data = await auth.signUp(email, password);
            console.log('🔍 [AUTHPROVIDER] Sign up successful:', data.user?.id);
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
        console.log('🔍 [AUTHPROVIDER] signOut called');
        try {
            setError(null);
            setLoading(true);
            await auth.signOut();
            console.log('🔍 [AUTHPROVIDER] Sign out successful');
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
        console.log('🔍 [AUTHPROVIDER] clearError called');
        setError(null);
    }, []);

    // Optimized context value - remove function deps since they're stable
    const value: AuthContextType = useMemo(() => {
        console.log('🔍 [AUTHPROVIDER] Context value being recreated');
        return {
            user,
            loading,
            error,
            signIn,
            signUp,
            signOut,
            clearError
        };
    }, [user, loading, error]); // Only state dependencies, functions are stable

    console.log('🔍 [AUTHPROVIDER] About to render children, current user:', user?.id || 'none');

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
});

AuthProvider.displayName = 'AuthProvider';
