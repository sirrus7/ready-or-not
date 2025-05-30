// src/hooks/useSupabaseOperation.ts - Enhanced Error Handling for Supabase Operations
import { useState, useCallback, useRef } from 'react';
import { formatSupabaseError } from '../utils/supabase';

export interface OperationState<T = any> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    hasError: boolean;
    lastUpdated: number | null;
}

export interface OperationOptions {
    // Error handling
    showErrorToast?: boolean;
    retryOnError?: boolean;
    maxRetries?: number;

    // Loading states
    initialLoading?: boolean;
    suppressLoadingFor?: number; // milliseconds

    // Caching
    cacheKey?: string;
    cacheTimeout?: number; // milliseconds

    // Success callbacks
    onSuccess?: (data: any) => void;
    onError?: (error: string) => void;

    // Transformation
    transform?: (data: any) => any;
}

interface CacheEntry {
    data: any;
    timestamp: number;
}

// Simple in-memory cache
const operationCache = new Map<string, CacheEntry>();

export const useSupabaseOperation = <T = any>(
    operation: () => Promise<T>,
    options: OperationOptions = {}
) => {
    const {
        showErrorToast = false,
        retryOnError = false,
        maxRetries = 2,
        initialLoading = false,
        suppressLoadingFor = 0,
        cacheKey,
        cacheTimeout = 5 * 60 * 1000, // 5 minutes default
        onSuccess,
        onError,
        transform
    } = options;

    const [state, setState] = useState<OperationState<T>>({
        data: null,
        isLoading: initialLoading,
        error: null,
        hasError: false,
        lastUpdated: null
    });

    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0);

    const clearLoadingTimeout = useCallback(() => {
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
        }
    }, []);

    const updateState = useCallback((updates: Partial<OperationState<T>>) => {
        setState(prev => ({
            ...prev,
            ...updates,
            lastUpdated: Date.now()
        }));
    }, []);

    const showError = useCallback((errorMessage: string) => {
        if (showErrorToast) {
            // You can integrate with your toast system here
            console.error('[Operation Error]', errorMessage);
        }
        onError?.(errorMessage);
    }, [showErrorToast, onError]);

    const checkCache = useCallback((): T | null => {
        if (!cacheKey) return null;

        const cached = operationCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < cacheTimeout) {
            console.log(`[useSupabaseOperation] Cache hit for ${cacheKey}`);
            return cached.data;
        }

        return null;
    }, [cacheKey, cacheTimeout]);

    const setCache = useCallback((data: T) => {
        if (cacheKey) {
            operationCache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
        }
    }, [cacheKey]);

    const executeOperation = useCallback(async (
        showLoading: boolean = true,
        isRetry: boolean = false
    ): Promise<T | null> => {
        // Check cache first
        if (!isRetry) {
            const cachedData = checkCache();
            if (cachedData) {
                updateState({
                    data: cachedData,
                    isLoading: false,
                    error: null,
                    hasError: false
                });
                return cachedData;
            }
        }

        // Clear any existing loading timeout
        clearLoadingTimeout();

        // Handle loading state with optional suppression
        if (showLoading) {
            if (suppressLoadingFor > 0) {
                loadingTimeoutRef.current = setTimeout(() => {
                    updateState({ isLoading: true });
                }, suppressLoadingFor);
            } else {
                updateState({ isLoading: true });
            }
        }

        try {
            console.log(`[useSupabaseOperation] Executing operation (retry: ${isRetry})`);
            const result = await operation();

            // Clear loading timeout and state
            clearLoadingTimeout();

            // Transform data if transformer provided
            const transformedData = transform ? transform(result) : result;

            // Cache the result
            setCache(transformedData);

            // Update state
            updateState({
                data: transformedData,
                isLoading: false,
                error: null,
                hasError: false
            });

            // Reset retry count on success
            retryCountRef.current = 0;

            // Call success callback
            onSuccess?.(transformedData);

            return transformedData;

        } catch (error) {
            clearLoadingTimeout();

            const errorMessage = formatSupabaseError(error);
            console.error('[useSupabaseOperation] Operation failed:', errorMessage);

            // Handle retries
            if (retryOnError && retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                console.log(`[useSupabaseOperation] Retrying... (${retryCountRef.current}/${maxRetries})`);

                // Exponential backoff
                const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));

                return executeOperation(false, true);
            }

            // Update error state
            updateState({
                isLoading: false,
                error: errorMessage,
                hasError: true
            });

            showError(errorMessage);

            return null;
        }
    }, [
        operation, checkCache, updateState, clearLoadingTimeout, suppressLoadingFor,
        transform, setCache, onSuccess, retryOnError, maxRetries, showError
    ]);

    const execute = useCallback(() => {
        return executeOperation(true, false);
    }, [executeOperation]);

    const refresh = useCallback(() => {
        // Clear cache and re-execute
        if (cacheKey) {
            operationCache.delete(cacheKey);
        }
        return executeOperation(true, false);
    }, [cacheKey, executeOperation]);

    const clearError = useCallback(() => {
        updateState({
            error: null,
            hasError: false
        });
    }, [updateState]);

    const clearData = useCallback(() => {
        if (cacheKey) {
            operationCache.delete(cacheKey);
        }
        updateState({
            data: null,
            error: null,
            hasError: false,
            isLoading: false
        });
    }, [cacheKey, updateState]);

    // Cleanup on unmount
    const cleanup = useCallback(() => {
        clearLoadingTimeout();
    }, [clearLoadingTimeout]);

    return {
        // State
        ...state,

        // Actions
        execute,
        refresh,
        clearError,
        clearData,
        cleanup,

        // Computed values
        canRetry: state.hasError && retryOnError && retryCountRef.current < maxRetries,
        retryCount: retryCountRef.current,

        // Cache utilities
        clearCache: () => {
            if (cacheKey) {
                operationCache.delete(cacheKey);
            }
        }
    };
};

// Specialized hooks for common patterns
export const useSupabaseQuery = <T = any>(
    queryFn: () => Promise<T>,
    dependencies: any[] = [],
    options: OperationOptions = {}
) => {
    const operation = useSupabaseOperation(queryFn, {
        retryOnError: true,
        maxRetries: 2,
        suppressLoadingFor: 200,
        ...options
    });

    // Auto-execute when dependencies change
    React.useEffect(() => {
        operation.execute();
    }, dependencies);

    // Cleanup on unmount
    React.useEffect(() => {
        return operation.cleanup;
    }, []);

    return operation;
};

export const useSupabaseMutation = <T = any>(
    mutationFn: () => Promise<T>,
    options: OperationOptions = {}
) => {
    return useSupabaseOperation(mutationFn, {
        retryOnError: false,
        showErrorToast: true,
        ...options
    });
};

// Global cache management
export const clearOperationCache = (pattern?: string) => {
    if (pattern) {
        const keysToDelete = Array.from(operationCache.keys()).filter(key =>
            key.includes(pattern)
        );
        keysToDelete.forEach(key => operationCache.delete(key));
    } else {
        operationCache.clear();
    }
};