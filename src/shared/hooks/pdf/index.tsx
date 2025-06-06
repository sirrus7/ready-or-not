
// Main function
export { generateTeamCardsPDF } from './generate-team-cards.ts';

// Types
export type { TeamConfig, PDFConfig, TeamCardAssets } from './types';

// Config
export { DEFAULT_CONFIG } from './config';

// Individual utilities (if needed)
export { validateTeams, validateConfig } from './utils/validation';
export { processLogo, generateQRCodeDataImage } from './utils/assets';
export { generateTeamCardHTML } from './templates/team-card';

import React, { createContext, useContext, useCallback, useState } from 'react';
import { generateTeamCardsPDF } from '../pdf';
import type { TeamConfig, TeamCardAssets, PDFConfig } from '../pdf';

interface TeamCardsPDFContextType {
    generatePDF: (teams: TeamConfig[], assets?: TeamCardAssets, config?: Partial<PDFConfig>) => Promise<void>;
    isGenerating: boolean;
}

const TeamCardsPDFContext = createContext<TeamCardsPDFContextType | null>(null);

export const TeamCardsPDFProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const generatePDF = useCallback(async (
        teams: TeamConfig[],
        assets: TeamCardAssets = {},
        customConfig?: Partial<PDFConfig>
    ) => {
        setIsGenerating(true);
        try {
            await generateTeamCardsPDF(teams, assets, customConfig);
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const value = {
        generatePDF,
        isGenerating
    };

    return (
        <TeamCardsPDFContext.Provider value={value}>
            {children}
            </TeamCardsPDFContext.Provider>
    );
};

export const useTeamCardsPDF = (): TeamCardsPDFContextType => {
    const context = useContext(TeamCardsPDFContext);
    if (!context) {
        throw new Error('useTeamCardsPDF must be used within TeamCardsPDFProvider');
    }
    return context;
};