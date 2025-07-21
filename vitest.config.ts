/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        // =====================================================
        // CRITICAL MOCK ISOLATION SETTINGS
        // These settings prevent mock bleeding between tests
        // =====================================================

        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],

        // ✅ CRITICAL: Enable automatic mock cleanup
        clearMocks: true,      // Clears call history before each test
        mockReset: true,       // Resets implementations before each test
        restoreMocks: true,    // Restores original functions before each test

        // ✅ Maximum test isolation
        isolate: true,         // Run each test in isolated environment
        globals: true,         // Enable global test functions

        // ✅ Prevent timeouts on slow operations
        testTimeout: 10000,    // 10 second timeout for async operations

        // ✅ Performance optimizations
        pool: 'threads',       // Use threads for better performance (default)
        poolOptions: {
            threads: {
                singleThread: false, // Allow parallel execution
            }
        },

        // ✅ Coverage settings (optional)
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/coverage/**'
            ]
        },

        // ✅ File patterns
        include: [
            'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
        ],

        // ✅ Update deprecated deps.inline setting
        server: {
            deps: {
                inline: [
                    // Inline ESM dependencies that need to be processed by Vite
                    '@testing-library/react',
                    '@testing-library/jest-dom'
                ]
            }
        }
    },
});