import { TeamConfig } from '../types';
import {
    createLeftSide,
    createRightSide,
    createFoldableCardContainer
} from './sections';

export const generateTeamCardHTML = (
    team: TeamConfig,
    logoUrl?: string,
    qrCodeImage?: string
): string => {

    console.debug(`logo: ${logoUrl?.slice(0,20)}, qrCodeImage: ${qrCodeImage?.slice(0, 20)}`)
    // Left side: Logo + Team Name + QR Code (rotated -90 degrees, baseline toward left edge)
    const leftSide = createLeftSide(
        team.name,
        logoUrl,
    );

    // Right side: Logo + Team Name + QR Code (rotated 90 degrees, baseline toward right edge)
    const rightSide = createRightSide(
        team.name,
        logoUrl,
        qrCodeImage
    );

    return createFoldableCardContainer(leftSide, rightSide);
};