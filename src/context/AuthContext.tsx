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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("AuthContext: Initial session data:", session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AuthContext: onAuthStateChange event:", event, "session:", session);
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        // setLoading(false) might be useful here if an initial load was pending
      }
      if (event === 'SIGNED_OUT') {
        setUser(null); // Explicitly set user to null on sign out
        setLoading(false); // Ensure loading is false after sign out
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
    setLoading(true); // Optional: set loading true during sign out process
    const { error } = await supabase.auth.signOut();
    // The onAuthStateChange listener should handle setting user to null and loading to false.
    if (error) {
      console.error("AuthContext: Error during signOut:", error);
      setLoading(false); // Ensure loading is false on error
      throw error;
    }
    console.log("AuthContext: supabase.auth.signOut() completed successfully.");
    // setUser(null); // Redundant if onAuthStateChange handles it, but safe
    // setLoading(false); // Redundant if onAuthStateChange handles it
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};