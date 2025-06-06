
import { TeamConfig, TeamCardAssets, PDFConfig } from './types';
import { DEFAULT_CONFIG } from './config';

import { validateTeams, validateConfig } from './utils/validation';
import { processLogo } from'./utils/assets';
import { createCaptureContainer, cleanupCaptureContainer } from './utils/dom';
import { createPDFDocument, generateTimestampedFilename } from './core/pdf-operations';
import { processTeamCard } from './core/orchestration';


export const generateTeamCardsPDF = async (
    teams: TeamConfig[],
    assets: TeamCardAssets = {},
    customConfig?: Partial<PDFConfig>,
    debug: boolean = false,
): Promise<void> => {
    // Validation
    validateTeams(teams);
    const config = { ...DEFAULT_CONFIG, ...customConfig };
    validateConfig(config);

    try {
        // Process shared assets
        await processLogo(assets.logoUrl);

        // Create PDF document
        const pdf = createPDFDocument(config, debug);

        // Create and setup capture container
        const container = createCaptureContainer();

        try {
            // Process each team
            for (let i = 0; i < teams.length; i++) {
                await processTeamCard(teams[i], i, pdf, container, assets, config, debug);
            }

            // Save PDF
            const filename = generateTimestampedFilename();
            pdf.save(filename);

        } finally {
            cleanupCaptureContainer(container);
        }

    } catch (error) {
        console.error("Error during PDF generation:", error);
        throw error;
    }
};