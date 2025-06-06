
import { PDFConfig } from '../types';

export const captureElementToPNG = async (
    element: HTMLElement,
    config: PDFConfig
): Promise<string> => {
    const html2canvas = (globalThis as any).html2canvas;

    const canvas = await html2canvas(element, {
        scale: config.scale,
        useCORS: true,
        logging: process.env.NODE_ENV === 'development',
        width: config.width,
        height: config.height,
        windowWidth: config.width,
        windowHeight: config.height,
        backgroundColor: config.backgroundColor || null,
    });

    return canvas.toDataURL('image/png');
};

export const renderTeamCardInContainer = async (
    container: HTMLElement,
    team: any, // TeamConfig
    assets: any // TeamCardAssets
): Promise<void> => {
    const { processTeamAssets } = await import('../utils/assets');
    const { generateTeamCardHTML } = await import('../templates/team-card');
    const { sleep } = await import('../utils/dom');

    const teamAssets = await processTeamAssets(team, assets);
    const html = generateTeamCardHTML(team, assets.logoUrl, teamAssets.qrCodeUrl);

    container.innerHTML = html;
    await sleep(150);
};