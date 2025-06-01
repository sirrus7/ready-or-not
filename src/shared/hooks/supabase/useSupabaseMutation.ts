// src/hooks/supabase/useSupabaseMutation.ts - Mutation specialization
import { useState, useCallback } from 'react';
import { formatSupabaseError } from '@shared/services/supabase';
import { OperationOptions, OperationState } from './core/useSupabaseOperation';

export const useSupabaseMutation = <TData = any, TVariables = any>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options: OperationOptions = {}
) => {
    const {
        showErrorToast = true,
        onSuccess,
        onError,
        transform
    } = options;

    const [state, setState] = useState<OperationState<TData>>({
        data: null,
        isLoading: false,
        error: null,
        hasError: false,
        lastUpdated: null
    });

    const updateState = useCallback((updates: Partial<OperationState<TData>>) => {
        setState(prev => ({
            ...prev,
            ...updates,
            lastUpdated: Date.now()
        }));
    }, []);

    const showError = useCallback((errorMessage: string) => {
        if (showErrorToast) {
            console.error('[Mutation Error]', errorMessage);
        }
        onError?.(errorMessage);
    }, [showErrorToast, onError]);

    const execute = useCallback(async (variables: TVariables): Promise<TData | null> => {
        updateState({
            isLoading: true,
            error: null,
            hasError: false
        });

        try {
            const result = await mutationFn(variables);

            // Transform data if transformer provided
            const transformedData = transform ? transform(result) : result;

            updateState({
                data: transformedData,
                isLoading: false,
                error: null,
                hasError: false
            });

            onSuccess?.(transformedData);
            return transformedData;

        } catch (error) {
            const errorMessage = formatSupabaseError(error);

            updateState({
                isLoading: false,
                error: errorMessage,
                hasError: true
            });

            showError(errorMessage);
            return null;
        }
    }, [mutationFn, transform, onSuccess, showError, updateState]);

    const clearError = useCallback(() => {
        updateState({
            error: null,
            hasError: false
        });
    }, [updateState]);

    const clearData = useCallback(() => {
        updateState({
            data: null,
            error: null,
            hasError: false,
            isLoading: false
        });
    }, [updateState]);

    return {
        ...state,
        execute,
        mutate: execute, // Alias for common mutation pattern
        clearError,
        clearData,
        // Computed values
        canRetry: false, // Mutations typically don't retry
        retryCount: 0
    };
};
