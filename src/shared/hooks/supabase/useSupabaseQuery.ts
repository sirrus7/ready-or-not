// src/hooks/supabase/useSupabaseQuery.ts - Query specialization
import { useEffect } from 'react';
import { useSupabaseOperation, OperationOptions } from './core/useSupabaseOperation';

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
    useEffect(() => {
        operation.execute();
    }, dependencies);

    // Cleanup on unmount
    useEffect(() => {
        return operation.cleanup;
    }, []);

    return operation;
};
