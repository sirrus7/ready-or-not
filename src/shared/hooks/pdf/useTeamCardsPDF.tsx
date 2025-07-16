// =====================================================================================
// src/shared/hooks/pdf/useTeamCardsPDF.tsx - Optimized PDFProvider
// =====================================================================================
import React, {createContext, useContext, useCallback, useState, useMemo, useEffect} from 'react';
import {generateTeamCardsPDF} from './generate-team-cards';
import type {TeamConfig, TeamCardAssets, PDFConfig} from './types';

// PDF Types and Context (existing types)
type PDFType = 'teamCards';

type PDFTypeMap = {
    teamCards: {
        teams: TeamConfig[];
        assets?: TeamCardAssets;
        config?: Partial<PDFConfig>;
        debug: boolean;
    };
};

interface BasePDFState {
    isGenerating: boolean;
    error: string | null;
}

interface PDFGenerationContextType<T extends PDFType> extends BasePDFState {
    generatePDF: (data: PDFTypeMap[T]) => Promise<void>;
    clearError: () => void;
}

interface PDFGenerationContextValue extends BasePDFState {
    generatePDF: <T extends PDFType>(type: T, data: PDFTypeMap[T], debug: boolean) => Promise<void>;
    clearError: () => void;
}

const PDFGenerationContext = createContext<PDFGenerationContextValue | null>(null);

// ✅ OPTIMIZED: Memoized PDFProvider
export const PDFGenerationProvider: React.FC<{ children: React.ReactNode }> = React.memo(({children}) => {
    useEffect(() => {
        console.log('🏗️ [PDFPROVIDER] COMPONENT MOUNTED');
        return () => console.log('💀 [PDFPROVIDER] COMPONENT UNMOUNTED');
    }, []);

    console.log('🔍 [PDFPROVIDER] Component re-rendering');

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // ✅ Stable generator functions
    const generatePDF = useCallback(async <T extends PDFType>(
        type: T,
        data: PDFTypeMap[T],
        debug: boolean = false
    ) => {
        setIsGenerating(true);
        setError(null);
        try {
            if (type === 'teamCards') {
                const {teams, assets = {}, config} = data as PDFTypeMap['teamCards'];
                await generateTeamCardsPDF(teams, assets, config, debug);
            }
            // Future PDF types can be added here
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : `Failed to generate ${type} PDF`;
            setError(errorMessage);
            throw err;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    // ✅ Memoized context value
    const value: PDFGenerationContextValue = useMemo(() => ({
        generatePDF,
        isGenerating,
        error,
        clearError
    }), [generatePDF, isGenerating, error, clearError]);

    return (
        <PDFGenerationContext.Provider value={value}>
            {children}
        </PDFGenerationContext.Provider>
    );
});

PDFGenerationProvider.displayName = 'PDFGenerationProvider';

// ✅ Optimized hook
export function usePDFGeneration<T extends PDFType>(type: T, debug: boolean = false): PDFGenerationContextType<T> {
    const context = useContext(PDFGenerationContext);
    if (!context) {
        throw new Error('usePDFGeneration must be used within PDFGenerationProvider');
    }

    const {generatePDF: baseGeneratePDF, isGenerating, error, clearError} = context;

    const generatePDF = useCallback(
        (data: PDFTypeMap[T]) => baseGeneratePDF(type, data, debug),
        [baseGeneratePDF, type, debug]
    );

    return {
        generatePDF,
        isGenerating,
        error,
        clearError
    };
}
