
import { TeamConfig, TeamCardAssets, PDFConfig } from '../types';
import { renderTeamCardInContainer } from './capture';
import { captureElementToPNG } from './capture';
import { addImageToPDF } from './pdf-operations';


export const processTeamCard = async (
    team: TeamConfig,
    index: number,
    pdf: any,
    container: HTMLElement,
    assets: TeamCardAssets,
    config: PDFConfig,
    debug: boolean,
): Promise<void> => {
    console.log(`Processing card for team: ${team.name} (${index + 1})`);

    await renderTeamCardInContainer(container, team, assets, debug);
    const imageData = await captureElementToPNG(container, config, debug);
    addImageToPDF(pdf, imageData, index === 0, debug);

    console.log(`Completed card for team: ${team.name}`);
};