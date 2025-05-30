// src/hooks/supabase/core/useSupabaseOperation.ts - Core logic (150 lines)
import { useState, useCallback, useRef } from 'react';
import { formatSupabaseError } from '../../../utils/supabase';
import { OperationCache } from '../utils/operationCache';
import { RetryManager } from '../utils/retryLogic';

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
        cacheTimeout = 5 * 60 * 1000,
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
    const cache = useRef(new OperationCache());
    const retryManager = useRef(new RetryManager(maxRetries));

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
            // Integrate with your toast system here
            console.error('[Operation Error]', errorMessage);
        }
        onError?.(errorMessage);
    }, [showErrorToast, onError]);

    const executeOperation = useCallback(async (
        showLoading: boolean = true,
        isRetry: boolean = false
    ): Promise<T | null> => {
        // Check cache first
        if (!isRetry && cacheKey) {
            const cachedData = cache.current.get<T>(cacheKey, cacheTimeout);
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

        // Handle loading state with optional suppression
        clearLoadingTimeout();
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
            const result = await operation();
            clearLoadingTimeout();

            // Transform data if transformer provided
            const transformedData = transform ? transform(result) : result;

            // Cache the result
            if (cacheKey) {
                cache.current.set(cacheKey, transformedData);
            }

            // Update state
            updateState({
                data: transformedData,
                isLoading: false,
                error: null,
                hasError: false
            });

            // Reset retry count on success
            retryManager.current.reset();

            // Call success callback
            onSuccess?.(transformedData);

            return transformedData;

        } catch (error) {
            clearLoadingTimeout();
            const errorMessage = formatSupabaseError(error);

            // Handle retries
            if (retryOnError && retryManager.current.shouldRetry()) {
                console.log(`[useSupabaseOperation] Retrying... (${retryManager.current.getAttemptCount()}/${maxRetries})`);

                await retryManager.current.delay();
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
        operation, cacheKey, cacheTimeout, updateState, clearLoadingTimeout,
        suppressLoadingFor, transform, onSuccess, retryOnError, maxRetries, showError
    ]);

    const execute = useCallback(() => {
        return executeOperation(true, false);
    }, [executeOperation]);

    const refresh = useCallback(() => {
        // Clear cache and re-execute
        if (cacheKey) {
            cache.current.delete(cacheKey);
        }
        retryManager.current.reset();
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
            cache.current.delete(cacheKey);
        }
        updateState({
            data: null,
            error: null,
            hasError: false,
            isLoading: false
        });
        retryManager.current.reset();
    }, [cacheKey, updateState]);

    // Cleanup on unmount
    const cleanup = useCallback(() => {
        clearLoadingTimeout();
        retryManager.current.reset();
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
        canRetry: state.hasError && retryOnError && retryManager.current.canRetry(),
        retryCount: retryManager.current.getAttemptCount(),

        // Cache utilities
        clearCache: () => {
            if (cacheKey) {
                cache.current.delete(cacheKey);
            }
        }
    };
};
