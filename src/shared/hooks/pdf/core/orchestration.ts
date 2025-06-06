
import { TeamConfig, TeamCardAssets, PDFConfig } from '../types';

export const processTeamCard = async (
    team: TeamConfig,
    index: number,
    pdf: any,
    container: HTMLElement,
    assets: TeamCardAssets,
    config: PDFConfig
): Promise<void> => {
    console.log(`Processing card for team: ${team.name} (${index + 1})`);

    const { renderTeamCardInContainer } = await import('./capture');
    const { captureElementToPNG } = await import('./capture');
    const { addImageToPDF } = await import('./pdf-operations');

    await renderTeamCardInContainer(container, team, assets);
    const imageData = await captureElementToPNG(container, config);
    addImageToPDF(pdf, imageData, index === 0);

    console.log(`Completed card for team: ${team.name}`);
};