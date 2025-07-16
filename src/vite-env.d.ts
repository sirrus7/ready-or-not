/**
 * Environment Types Configuration
 * TypeScript definitions for environment variables
 *
 * File: src/vite-env.d.ts (update existing or create new)
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_GLOBAL_GAME_LOADER_URL: string;
    readonly VITE_JWT_SECRET: string;
    readonly VITE_APP_TITLE: string;
    readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}