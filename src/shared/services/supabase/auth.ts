// src/shared/services/supabase/auth.ts - UPDATED WITH setSession METHOD
import { supabase } from './client';
import { User } from '@supabase/supabase-js';
export type { User };

export const auth = {
    async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    async signUp(email: string, password: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getSession() {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    },

    // 🔧 NEW: Add setSession method for magic link support
    async setSession({ access_token, refresh_token }: { access_token: string; refresh_token: string }) {
        const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
        });
        if (error) throw error;
        return data;
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
        return supabase.auth.onAuthStateChange(callback);
    }
};