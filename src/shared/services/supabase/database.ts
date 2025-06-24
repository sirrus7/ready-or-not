// src/shared/services/supabase/database.ts - Cleaned version without RPC support

// Circuit breaker state (shared across all operations)
const circuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: null as number | null,
    threshold: 5,
    resetTimeoutMs: 30000 // 30 seconds
};

// CRITICAL OPERATIONS that should bypass circuit breaker
const CRITICAL_OPERATIONS = [
    'auth',
    'authentication',
    'login',
    'sign in',
    'sign up',
    'sign out',
    'session verification',
    'user profile'
];

const isCriticalOperation = (context: string): boolean => {
    const lowerContext = context.toLowerCase();
    return CRITICAL_OPERATIONS.some(op => lowerContext.includes(op));
};

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

// Enhanced retry wrapper with circuit breaker, timeout, and exponential backoff
export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    context: string = 'Database operation',
    timeoutMs: number = 10000
): Promise<T> => {
    // ✅ CRITICAL FIX: Don't block authentication operations
    const bypassCircuitBreaker = isCriticalOperation(context);

    // Circuit breaker check (but allow critical operations through)
    if (circuitBreakerState.isOpen && !bypassCircuitBreaker) {
        const now = Date.now();
        if (circuitBreakerState.lastFailureTime &&
            now - circuitBreakerState.lastFailureTime > circuitBreakerState.resetTimeoutMs) {
            // Reset circuit breaker
            circuitBreakerState.isOpen = false;
            circuitBreakerState.failureCount = 0;
            console.log(`🔌 [Supabase DB] Circuit breaker reset for ${context}`);
        } else {
            const remainingTime = Math.ceil((circuitBreakerState.resetTimeoutMs - (now - circuitBreakerState.lastFailureTime!)) / 1000);
            throw new Error(`Circuit breaker open for ${context}. Retry in ${remainingTime} seconds.`);
        }
    }

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Add timeout to operation
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs);
            });

            const result = await Promise.race([operation(), timeoutPromise]);

            // Success - reset circuit breaker (but only if this wasn't a bypassed operation)
            if (circuitBreakerState.failureCount > 0 && !bypassCircuitBreaker) {
                circuitBreakerState.failureCount = 0;
                console.log(`✅ [Supabase DB] Circuit breaker reset after successful ${context}`);
            }

            if (attempt > 0) {
                console.log(`[Supabase DB] ${context} succeeded on attempt ${attempt + 1}`);
            }
            return result;
        } catch (error) {
            lastError = error;

            // ✅ CRITICAL FIX: Only update circuit breaker for non-critical operations
            if (!bypassCircuitBreaker) {
                // Update circuit breaker on failure
                circuitBreakerState.failureCount++;

                const isConnectionError =
                    error.name === 'TypeError' ||
                    error.message?.includes('fetch') ||
                    error.message?.includes('timeout') ||
                    error.message?.includes('network') ||
                    error.code === 'PGRST301';

                if (isConnectionError && circuitBreakerState.failureCount >= circuitBreakerState.threshold) {
                    circuitBreakerState.isOpen = true;
                    circuitBreakerState.lastFailureTime = Date.now();
                    console.log(`🔌 [Supabase DB] Circuit breaker opened after ${circuitBreakerState.failureCount} failures (${context})`);
                }
            }

            console.warn(`[Supabase DB] ${context} attempt ${attempt + 1} failed:`, formatSupabaseError(error));

            if (attempt < maxRetries && (!circuitBreakerState.isOpen || bypassCircuitBreaker)) {
                // Exponential backoff with jitter
                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error(`[Supabase DB] ${context} failed after ${maxRetries + 1} attempts`);
    throw lastError;
};

// Circuit breaker status check (useful for health checks)
export const getCircuitBreakerStatus = () => ({
    isOpen: circuitBreakerState.isOpen,
    failureCount: circuitBreakerState.failureCount,
    lastFailureTime: circuitBreakerState.lastFailureTime
});

// Manual circuit breaker reset (for admin/debugging)
export const resetCircuitBreaker = () => {
    circuitBreakerState.isOpen = false;
    circuitBreakerState.failureCount = 0;
    circuitBreakerState.lastFailureTime = null;
    console.log('🔌 [Supabase DB] Circuit breaker manually reset');
};

// ============================================================================
// RPC FUNCTION REMOVED - All database operations now use direct queries
// ============================================================================
// The callRPC function has been completely removed since we're not using
// any RPC functions anymore. All operations now use direct table queries
// which are faster, more reliable, and easier to debug.
