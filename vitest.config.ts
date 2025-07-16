/**
 * Vitest Configuration - Fixed Version
 * Proper test environment setup with React Testing Library
 *
 * File: vitest.config.ts
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        // Environment setup
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],

        // Test file patterns
        include: [
            'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
            'src/**/__tests__/**/*.{js,ts,jsx,tsx}'
        ],
        exclude: [
            'node_modules',
            'dist',
            '.next',
            '.nuxt',
            '.vercel',
            '.netlify'
        ],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/dist/**',
                '**/.{idea,git,cache,output,temp}/**'
            ],
            thresholds: {
                statements: 80,
                branches: 75,
                functions: 80,
                lines: 80
            }
        },

        // Timeout configuration
        testTimeout: 10000,
        hookTimeout: 10000,

        // Reporter configuration
        reporter: process.env.CI ? ['verbose', 'json'] : ['verbose'],

        // Mock configuration
        deps: {
            inline: [
                '@testing-library/jest-dom'
            ]
        },

        // Pool options for better isolation
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: false,
                minThreads: 1,
                maxThreads: 4
            }
        },

        // Retry configuration
        retry: process.env.CI ? 2 : 0,

        // Watch configuration
        watch: !process.env.CI,

        // Sequence configuration
        sequence: {
            concurrent: true,
            shuffle: false
        },

        // Silent mode for cleaner output
        silent: false,

        // Clear console between tests
        clearMocks: true,
        restoreMocks: true,
        unstubEnvs: true,
        unstubGlobals: true
    },

    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@/components': resolve(__dirname, './src/components'),
            '@/services': resolve(__dirname, './src/services'),
            '@/hooks': resolve(__dirname, './src/hooks'),
            '@/utils': resolve(__dirname, './src/utils'),
            '@/types': resolve(__dirname, './src/types'),
            '@/test': resolve(__dirname, './src/test')
        }
    },

    define: {
        global: 'globalThis'
    }
})