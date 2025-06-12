// src/app/providers/AuthProvider.tsx
import React, {createContext, useContext, useEffect, useState} from 'react';
import {User} from '@supabase/supabase-js';
import {auth, useSupabaseConnection, ConnectionStatus} from '@shared/services/supabase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    connectionStatus: ConnectionStatus; // <-- ADD THIS
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
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

    // ADD THE HOOK HERE - one central place
    const connectionStatus = useSupabaseConnection();

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const {data: {session}} = await auth.getSession();
                setUser(session?.user ?? null);
            } catch (err) {
                console.error("AuthContext: Exception getting session:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        const {data: {subscription}} = auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        await auth.signIn(email, password);
    };

    const signUp = async (email: string, password: string) => {
        await auth.signUp(email, password);
    };

    const signOut = async () => {
        setLoading(true);
        await auth.signOut();
    };

    const value = {
        user,
        loading,
        connectionStatus, // <-- EXPOSE IT VIA CONTEXT
        signIn,
        signUp,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
