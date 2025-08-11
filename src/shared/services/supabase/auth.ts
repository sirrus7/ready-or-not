// src/utils/supabase/auth.ts - Authentication utilities (for future use)
import {supabase} from './client';
import {User} from '@supabase/supabase-js';

export type {User};

export const auth = {
    async signIn(email: string, password: string) {
        const {data, error} = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    async handleMagicLinkTokens() {
        // Check for auth tokens in URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken: string | null = hashParams.get('access_token');
        const refreshToken: string | null = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
            console.log('🔗 Processing magic link tokens...');

            const {data, error} = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (error) throw error;

            // Clear tokens from URL for security
            window.history.replaceState(null, '', window.location.pathname);

            console.log('✅ Magic link session established');
            return data.session;
        }

        return null;
    },

    async signUp(email: string, password: string) {
        const {data, error} = await supabase.auth.signUp({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const {error} = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getSession() {
        const {data, error} = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
        return supabase.auth.onAuthStateChange(callback);
    }
};
