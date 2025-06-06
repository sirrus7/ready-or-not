import React, { createContext, useContext, useCallback, useState } from 'react';
import { generateTeamCardsPDF } from '../pdf';
import type { TeamConfig, TeamCardAssets, PDFConfig } from '../pdf';

// ============================================
// PDF Type Registry & Type Mappings
// ============================================

// Available PDF types
type PDFType = 'teamCards'; // | 'invoice' | 'report' (future)

// Type mappings for each PDF type
interface PDFTypeMap {
    teamCards: {
        teams: TeamConfig[];
        assets?: TeamCardAssets;
        config?: Partial<PDFConfig>;
        debug: boolean;
    };
    // Future types:
    // invoice: {
    //   invoice: InvoiceData;
    //   assets?: InvoiceAssets;
    //   config?: InvoiceConfig;
    // };
    // report: {
    //   report: ReportData;
    //   assets?: ReportAssets;
    //   config?: ReportConfig;
    // };
}

// Generator functions for each PDF type
type PDFGeneratorMap = {
    [K in PDFType]: (data: PDFTypeMap[K]) => Promise<void>;
};

// ============================================
// PDF Generation Context
// ============================================

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

// ============================================
// PDF Provider
// ============================================

export const PDFGenerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // PDF generators registry
    const generators: PDFGeneratorMap = {
        teamCards: async ({ teams, assets = {}, config, debug }) => {
            await generateTeamCardsPDF(teams, assets, config, debug);
        },
        // Future generators:
        // invoice: async ({ invoice, assets, config }) => {
        //   await generateInvoicePDF(invoice, assets, config);
        // },
        // report: async ({ report, assets, config }) => {
        //   await generateReportPDF(report, assets, config);
        // },
    };

    const generatePDF = useCallback(async <T extends PDFType>(
        type: T,
        data: PDFTypeMap[T]
    ) => {
        setIsGenerating(true);
        setError(null);
        try {
            const generator = generators[type];
            await generator(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : `Failed to generate ${type} PDF`;
            setError(errorMessage);
            throw err;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const value: PDFGenerationContextValue = {
        generatePDF,
        isGenerating,
        error,
        clearError
    };

    return (
        <PDFGenerationContext.Provider value={value}>
            {children}
        </PDFGenerationContext.Provider>
    );
};

// ============================================
// Typed Hook for Specific PDF Types
// ============================================

export function usePDFGeneration<T extends PDFType>(type: T, debug: boolean): PDFGenerationContextType<T> {
    const context = useContext(PDFGenerationContext);
    if (!context) {
        throw new Error('usePDFGeneration must be used within PDFGenerationProvider');
    }

    const { generatePDF: baseGeneratePDF, isGenerating, error, clearError } = context;

    const generatePDF = useCallback(
        (data: PDFTypeMap[T]) => baseGeneratePDF(type, data, debug),
        [baseGeneratePDF, type]
    );

    return {
        generatePDF,
        isGenerating,
        error,
        clearError
    };
}

// ============================================
// Type Exports for Consumers
// ============================================

export type { PDFType, PDFTypeMap };