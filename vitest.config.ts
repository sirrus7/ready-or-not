import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
    },
    define: {
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://mock-supabase-url.supabase.co'),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('mock-supabase-key'),
        'import.meta.env.VITE_JWT_SECRET': JSON.stringify('test-jwt-secret'),
        'import.meta.env.VITE_GLOBAL_GAME_LOADER_URL': JSON.stringify('http://localhost:3001'),
    },
})