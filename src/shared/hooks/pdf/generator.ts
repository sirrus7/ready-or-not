
import { TeamConfig, TeamCardAssets, PDFConfig } from './types';
import { DEFAULT_CONFIG } from './config';

export const generateTeamCardsPDF = async (
    teams: TeamConfig[],
    assets: TeamCardAssets = {},
    customConfig?: Partial<PDFConfig>
): Promise<void> => {
    // Dynamic imports to keep bundle size small
    const { validateTeams, validateConfig } = await import('./utils/validation');
    const { processLogo } = await import('./utils/assets');
    const { createCaptureContainer, cleanupCaptureContainer } = await import('./utils/dom');
    const { loadPDFDependencies, createPDFDocument, generateTimestampedFilename } = await import('./core/pdf-operations');
    const { processTeamCard } = await import('./core/orchestration');

    // Validation
    validateTeams(teams);
    const config = { ...DEFAULT_CONFIG, ...customConfig };
    validateConfig(config);

    try {
        // Process shared assets
        await processLogo(assets.logoUrl);

        // Load dependencies
        await loadPDFDependencies();

        // Create PDF document
        const pdf = createPDFDocument(config);

        // Create and setup capture container
        const container = createCaptureContainer();

        try {
            // Process each team
            for (let i = 0; i < teams.length; i++) {
                await processTeamCard(teams[i], i, pdf, container, assets, config);
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