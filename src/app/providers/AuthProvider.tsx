// src/app/providers/AuthProvider.tsx - SIMPLIFIED VERSION
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
                console.log('🔄 Initializing Ready or Not authentication...');

                // =====================================================
                // SIMPLIFIED: JUST CHECK FOR EXISTING SESSION
                // =====================================================
                // Magic link processing is now handled by MagicLinkHandler
                // This component only needs to check for existing sessions

                console.log('🔍 Checking for existing session...');

                try {
                    const sessionResponse = await auth.getSession();

                    console.log('📋 Session check result:', {
                        hasResponse: !!sessionResponse,
                        hasData: !!sessionResponse?.data,
                        hasSession: !!sessionResponse?.data?.session,
                        hasUser: !!sessionResponse?.data?.session?.user,
                        userEmail: sessionResponse?.data?.session?.user?.email
                    });

                    if (sessionResponse && sessionResponse.data && sessionResponse.data.session) {
                        const session = sessionResponse.data.session;
                        if (session.user) {
                            console.log('✅ Found existing session for:', session.user.email);
                            console.log('👤 User metadata:', session.user.user_metadata);
                            setUser(session.user);
                            setError(null);
                        } else {
                            console.log('ℹ️ Session exists but no user data');
                            setUser(null);
                        }
                    } else {
                        console.log('ℹ️ No existing session found');
                        setUser(null);
                    }
                } catch (sessionCheckError) {
                    console.error('❌ Session check failed:', sessionCheckError);
                    setUser(null);
                }

            } catch (err) {
                console.error('❌ Auth initialization failed:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
                setUser(null);
            } finally {
                setLoading(false);
                console.log('🏁 Auth initialization completed');
            }
        };

        initializeAuth();

        // Set up auth state change listener
        const {data: {subscription}} = auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state change:', event, session?.user?.email || 'no user');

            switch (event) {
                case 'SIGNED_IN':
                    if (session?.user) {
                        console.log('✅ User signed in via auth state change:', session.user.email);
                        setUser(session.user);
                        setError(null);
                    }
                    break;

                case 'SIGNED_OUT':
                    console.log('👋 User signed out');
                    setUser(null);
                    setError(null);
                    break;

                case 'TOKEN_REFRESHED':
                    if (session?.user) {
                        console.log('🔄 Token refreshed for:', session.user.email);
                        setUser(session.user);
                        setError(null);
                    }
                    break;

                case 'INITIAL_SESSION':
                    if (session?.user) {
                        console.log('🎯 Initial session established:', session.user.email);
                        setUser(session.user);
                        setError(null);
                    } else {
                        console.log('🎯 Initial session: no user');
                        setUser(null);
                    }
                    break;

                default:
                    console.log(`ℹ️ Unhandled auth event: ${event}`);
            }

            // Set loading false for any auth event
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
            console.log('🔐 Signing in:', email);

            const { error } = await auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

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
            console.log('📝 Signing up:', email);

            const { error } = await auth.signUp({
                email,
                password,
            });

            if (error) throw error;

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
            console.log('🚪 Signing out...');

            const { error } = await auth.signOut();

            if (error) throw error;

            // Success handled by onAuthStateChange
        } catch (err) {
            console.error('[AuthProvider] Sign out error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
            setError(errorMessage);
            throw err;
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const contextValue = useMemo(() => ({
        user,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        clearError,
    }), [user, loading, error, signIn, signUp, signOut, clearError]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
});