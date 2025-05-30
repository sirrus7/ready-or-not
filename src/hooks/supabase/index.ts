// src/hooks/supabase/index.ts - Clean public API
export { useSupabaseOperation } from './core/useSupabaseOperation';
export { useSupabaseQuery } from './useSupabaseQuery';
export { useSupabaseMutation } from './useSupabaseMutation';
export type { OperationState, OperationOptions } from './core/useSupabaseOperation';

// Legacy compatibility
export const clearOperationCache = (pattern?: string) => {
    console.warn('[Deprecated] Use individual operation clearCache methods instead');
};