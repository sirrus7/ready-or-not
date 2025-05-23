import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext: useEffect for getSession and onAuthStateChange running");

    // Get initial session with a longer timeout for student display scenarios
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log("AuthContext: Initial session data:", session, "Error:", error);

        if (error) {
          console.error("AuthContext: Error getting session:", error);
        }

        setUser(session?.user ?? null);
        setLoading(false);
      } catch (err) {
        console.error("AuthContext: Exception getting session:", err);
        setUser(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AuthContext: onAuthStateChange event:", event, "session:", session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        setLoading(false);
      }
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChange");
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    console.log("AuthContext: signOut called");
    setLoading(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("AuthContext: Error during signOut:", error);
      setLoading(false);
      throw error;
    }
    console.log("AuthContext: supabase.auth.signOut() completed successfully.");
  };

  return (
      <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
        {children}
      </AuthContext.Provider>
  );
};