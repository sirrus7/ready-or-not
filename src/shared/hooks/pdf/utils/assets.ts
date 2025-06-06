import { TeamConfig, TeamCardAssets, ProcessedTeamAssets } from '../types';
import { QR_CODE_OPTIONS } from '../config';
import QRCode from "qrcode";

export const preloadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
};

export const generateQRCodeDataImage = async (text: string): Promise<string> => {
    try {
        return QRCode.toDataURL(text, QR_CODE_OPTIONS);
    } catch (error) {
        console.error('Failed to generate QR code:', error);
        return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="white" stroke="black"/>
        <text x="50" y="50" text-anchor="middle" font-size="12">QR ERROR</text>
      </svg>
    `)}`;
    }
};

export const processLogo = async (logoUrl?: string): Promise<void> => {
    if (!logoUrl) return;

    try {
        await preloadImage(logoUrl);
        console.log("Logo preloaded successfully for html2canvas.");
    } catch (error) {
        console.warn("Logo preloading failed - continuing without logo:", error);
        // Don't throw error, just continue without logo
    }
};

// TODO - consolidate this
export const processQRCode = async (
    team: TeamConfig,
    url: string,
): Promise<string | undefined> => {

    try {
        return await generateQRCodeDataImage(url);
    } catch (error) {
        console.error(`Failed to generate QR code for team ${team.name}`, error);
        return undefined;
    }
};

export const processTeamAssets = async (
    team: TeamConfig,
    assets: TeamCardAssets,
): Promise<ProcessedTeamAssets> => {
    const [qrCodeUrl] = await Promise.all([
        processQRCode(team, assets.teamJoinUrl!),
    ]);

    return { qrCodeUrl };
};