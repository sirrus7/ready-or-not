
import { PDFConfig } from '../types';
import {debugHTML, previewImage} from "@shared/hooks/pdf/debug.ts";
import html2canvas from "html2canvas";

import { processTeamAssets } from '../utils/assets';
import { generateTeamCardHTML } from '../templates/team-card';
import { sleep } from '../utils/dom';

export const captureElementToPNG = async (
    element: HTMLElement,
    config: PDFConfig,
    debug: boolean,
): Promise<string> => {

    const canvas = await html2canvas(element, {
        scale: config.scale,
        useCORS: true,
        logging: process.env.NODE_ENV === 'development',
        // width: config.width,
        // height: config.height,
        // windowWidth: config.width,
        // windowHeight: config.height,
        // backgroundColor: config.backgroundColor || null,
    });

    if (debug) {
        await previewImage(canvas);
    }

    return canvas.toDataURL('image/png');
};

export const renderTeamCardInContainer = async (
    container: HTMLElement,
    team: any, // TeamConfig
    assets: any, // TeamCardAssets
    debug: boolean,
): Promise<void> => {

    const teamAssets = await processTeamAssets(team, assets);
    const html = generateTeamCardHTML(team, assets.logoUrl, teamAssets.qrCodeUrl);

    console.debug(`renderTeamCardInContainer - qrCodeUrl: ${teamAssets.qrCodeUrl}`)
    if (debug) {
        debugHTML(html);
    }
    container.innerHTML = html;
    await sleep(150);
};