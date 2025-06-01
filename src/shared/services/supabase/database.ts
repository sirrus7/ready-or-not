// src/utils/supabase/database.ts - Simplified shared utilities
import { supabase } from './client';

// Enhanced error formatter with specific Supabase error handling
export const formatSupabaseError = (error: any): string => {
    if (!error) return 'Unknown error occurred';

    // Handle network/connection errors
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        return 'Connection error - please check your internet connection';
    }

    if (error && typeof error === 'object' && 'message' in error) {
        let message = error.message;

        // Add helpful context for common Postgres errors
        switch (error.code) {
            case 'PGRST116':
                return 'No data found for the requested resource';
            case '23505':
                return 'This record already exists (duplicate entry)';
            case '23503':
                return 'Cannot delete - this record is referenced by other data';
            case '42501':
                return 'Permission denied - you may not have access to this resource';
            case 'PGRST301':
                return 'Request timeout - please try again';
            case 'PGRST204':
                return 'Resource not found';
            default:
                if (error.details) message += ` (${error.details})`;
                if (error.hint) message += ` Hint: ${error.hint}`;
        }
        return message;
    }

    return error.message || error.toString();
};

// Enhanced retry wrapper with exponential backoff
export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context: string = 'Database operation'
): Promise<T> => {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await operation();
            if (attempt > 0) {
                console.log(`[Supabase DB] ${context} succeeded on attempt ${attempt + 1}`);
            }
            return result;
        } catch (error) {
            lastError = error;
            console.warn(`[Supabase DB] ${context} attempt ${attempt + 1} failed:`, formatSupabaseError(error));

            if (attempt < maxRetries) {
                // Exponential backoff with jitter
                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error(`[Supabase DB] ${context} failed after ${maxRetries + 1} attempts`);
    throw lastError;
};

// Type-safe RPC wrapper
export const callRPC = async <T = any>(
    functionName: string,
    params: Record<string, any> = {},
    options: {
        expectedSingle?: boolean;
        context?: string;
        maxRetries?: number;
    } = {}
): Promise<T> => {
    const { expectedSingle = false, context = `RPC ${functionName}`, maxRetries = 2 } = options;

    return withRetry(async () => {
        console.log(`[Supabase RPC] Calling ${functionName} with params:`, params);

        const { data, error } = await supabase.rpc(functionName, params);

        if (error) {
            console.error(`[Supabase RPC] ${functionName} error:`, error);
            throw error;
        }

        if (expectedSingle) {
            return (data && data.length > 0) ? data[0] : null;
        }

        return data || [];
    }, maxRetries, 1000, context);
};
