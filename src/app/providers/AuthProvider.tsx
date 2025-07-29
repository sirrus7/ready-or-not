// src/app/providers/AuthProvider.tsx - ENHANCED WITH MAGIC LINK SUPPORT
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
                // MAGIC LINK DETECTION AND HANDLING
                // =====================================================

                const urlParams = new URLSearchParams(window.location.search);
                const urlHash = new URLSearchParams(window.location.hash.substring(1));

                // Check for magic link tokens in both query params and hash
                const accessToken = urlParams.get('access_token') || urlHash.get('access_token');
                const refreshToken = urlParams.get('refresh_token') || urlHash.get('refresh_token');
                const tokenType = urlParams.get('token_type') || urlHash.get('token_type');

                // Also check for direct auth tokens (newer Supabase format)
                const directToken = urlParams.get('token');
                const authType = urlParams.get('type');

                console.log('🔍 Checking for magic link parameters...');
                console.log('- Access Token:', !!accessToken);
                console.log('- Refresh Token:', !!refreshToken);
                console.log('- Direct Token:', !!directToken);
                console.log('- Auth Type:', authType);
                console.log('🔗 Full URL:', window.location.href);
                console.log('🔗 Search params:', window.location.search);
                console.log('🔗 Hash params:', window.location.hash);
                console.log('🔗 All URL params:', Object.fromEntries(urlParams.entries()));
                console.log('🔗 All hash params:', Object.fromEntries(urlHash.entries()));

                // Add this comprehensive check after line 55:
                console.log('🔍 All possible auth parameters:');
                const allParams = new URLSearchParams(window.location.search);
                const allHash = new URLSearchParams(window.location.hash.substring(1));

                // Check all possible parameter names
                const authParamNames = [
                    'access_token', 'refresh_token', 'token', 'code',
                    'token_type', 'expires_in', 'type', 'redirect_to'
                ];

                authParamNames.forEach(param => {
                    const queryValue = allParams.get(param);
                    const hashValue = allHash.get(param);
                    if (queryValue || hashValue) {
                        console.log(`- ${param}: query=${!!queryValue}, hash=${!!hashValue}`);
                    }
                });

                // Handle magic link with access/refresh tokens
                if (accessToken && refreshToken) {
                    console.log('🔗 Magic link detected (access/refresh tokens), setting session...');

                    try {
                        const { data, error: sessionError } = await auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });

                        if (sessionError) {
                            console.error('❌ Magic link session error:', sessionError);
                            setError('Failed to authenticate via magic link');
                        } else {
                            console.log('✅ Magic link session established successfully');
                            setUser(data.user);
                            setError(null);

                            // Clean the URL to remove tokens
                            const cleanUrl = window.location.pathname;
                            window.history.replaceState({}, document.title, cleanUrl);
                            console.log('🧹 URL cleaned after magic link authentication');
                        }
                    } catch (magicLinkError) {
                        console.error('❌ Magic link processing failed:', magicLinkError);
                        setError('Magic link authentication failed');
                    }
                }
                // Handle direct magic link token (older format)
                else if (directToken && authType === 'magiclink') {
                    console.log('🔗 Direct magic link token detected, verifying...');

                    try {
                        // Let Supabase handle the token verification automatically
                        // by checking session after a brief delay
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        const session = await auth.getSession();
                        if (session?.user) {
                            console.log('✅ Magic link verified, user authenticated');
                            setUser(session.user);
                            setError(null);

                            // Clean the URL
                            const cleanUrl = window.location.pathname;
                            window.history.replaceState({}, document.title, cleanUrl);
                        } else {
                            console.warn('⚠️ Magic link token found but no session established');
                        }
                    } catch (tokenError) {
                        console.error('❌ Magic link token verification failed:', tokenError);
                        setError('Magic link verification failed');
                    }
                }

                // =====================================================
                // STANDARD SESSION CHECK
                // =====================================================

                // Always check for existing session (if not already set by magic link)
                if (!user) {
                    console.log('🔍 Checking for existing session...');
                    const session = await auth.getSession();

                    if (session?.user) {
                        console.log('✅ Found existing session for:', session.user.email);
                        setUser(session.user);
                        setError(null);
                    } else {
                        console.log('ℹ️ No existing session found');
                        setUser(null);
                    }
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

            if (event === 'SIGNED_IN') {
                setUser(session?.user ?? null);
                setError(null);
                console.log('✅ User signed in via auth state change');
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setError(null);
                console.log('👋 User signed out');
            } else if (event === 'TOKEN_REFRESHED') {
                setUser(session?.user ?? null);
                setError(null);
                console.log('🔄 Token refreshed');
            } else if (event === 'INITIAL_SESSION') {
                setUser(session?.user ?? null);
                setError(null);
                console.log('🎯 Initial session established');
            }

            // Always set loading false for any auth event
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
            console.log('📝 Signing up:', email);
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
            console.log('👋 Signing out...');
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
    }, [user, loading, error, signIn, signUp, signOut, clearError]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
});

AuthProvider.displayName = 'AuthProvider';