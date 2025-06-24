// src/shared/hooks/supabase/useSupabaseQuery.ts - Enhanced with better cache control
import {useEffect, useCallback, useRef} from 'react';
import {useSupabaseOperation, OperationOptions} from './core/useSupabaseOperation';

export const useSupabaseQuery = <T = any>(
    queryFn: () => Promise<T>,
    dependencies: any[] = [],
    options: OperationOptions & {
        cacheKey?: string;
        cacheTimeout?: number;
    } = {}
) => {
    const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
    const {cacheKey, cacheTimeout = 5 * 60 * 1000, ...operationOptions} = options; // Default 5 minutes

    const operation = useSupabaseOperation(queryFn, {
        retryOnError: true,
        maxRetries: 2,
        suppressLoadingFor: 200,
        ...operationOptions
    });

    // Enhanced execute function with caching
    const executeWithCache = useCallback(async () => {
        if (cacheKey && cacheTimeout > 0) {
            const cached = cacheRef.current.get(cacheKey);
            const now = Date.now();

            if (cached && (now - cached.timestamp) < cacheTimeout) {
                // Use cached data but still return the operation state
                return cached.data;
            }
        }
        const result = await operation.execute();

        // Cache the result if cacheKey is provided
        if (cacheKey && result !== null) {
            cacheRef.current.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
        }

        return result;
    }, [cacheKey, cacheTimeout, operation]);

    // Clear cache function
    const clearCache = useCallback(() => {
        if (cacheKey) {
            cacheRef.current.delete(cacheKey);
        } else {
            cacheRef.current.clear();
        }
    }, [cacheKey]);

    // Enhanced refresh function that bypasses cache
    const refresh = useCallback(async () => {
        clearCache(); // Clear cache first
        return await operation.execute();
    }, [clearCache, operation]);

    // Auto-execute when dependencies change
    useEffect(() => {
        executeWithCache();
    }, dependencies);

    // Cleanup on unmount
    useEffect(() => {
        return operation.cleanup;
    }, []);

    return {
        ...operation,
        refresh,
        clearCache
    };
};
