import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {ignores: ['dist']},
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                {allowConstantExport: true},
            ],

            // ========================================================================
            // 🚨 SUPABASE SERVICE LAYER ENFORCEMENT RULES
            // ========================================================================
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@supabase/supabase-js'],
                            message: '🚨 Direct Supabase imports not allowed! Use services from "@shared/services/supabase" instead.\n\n✅ Correct: import { db } from "@shared/services/supabase";\n❌ Wrong: import { createClient } from "@supabase/supabase-js";'
                        }
                    ],
                    paths: [
                        {
                            name: '@shared/services/supabase/client',
                            message: '🚨 Direct Supabase client import not allowed! Use services from "@shared/services/supabase" instead.\n\n✅ Correct: import { db } from "@shared/services/supabase";\n❌ Wrong: import { supabase } from "@shared/services/supabase/client";'
                        }
                    ]
                }
            ]
        },
    },

    // ========================================================================
    // 🔥 EXCEPTION: Allow direct Supabase imports ONLY in service files
    // ========================================================================
    {
        files: [
            'src/shared/services/supabase/**/*.{ts,tsx}',
            'src/shared/services/supabase/client.ts'
        ],
        rules: {
            'no-restricted-imports': 'off' // Allow direct Supabase imports in service layer
        }
    },

    // ========================================================================
    // 📊 ADDITIONAL HELPFUL RULES FOR DATABASE BEST PRACTICES
    // ========================================================================
    {
        files: ['**/*.{ts,tsx}'],
        rules: {
            // Prevent console.log in production code (except in services for debugging)
            'no-console': ['warn', {
                allow: ['warn', 'error']
            }],

            // Encourage proper error handling
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],

            // Prevent any/unknown without explicit reasoning
            '@typescript-eslint/no-explicit-any': 'warn'
        }
    }
);
