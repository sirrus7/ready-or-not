import { TeamConfig } from '../types';
import {
    createLeftSide,
    createRightSide,
    createFoldableCardContainer
} from './sections';

export const generateTeamCardHTML = (
    team: TeamConfig,
    logoUrl?: string,
    qrCodeUrl?: string
): string => {
    // Left side: Logo + Team Name + QR Code (rotated -90 degrees, baseline toward left edge)
    const leftSide = createLeftSide(
        team.name,
        logoUrl,
        qrCodeUrl
    );

    // Right side: Logo + Team Name + QR Code (rotated 90 degrees, baseline toward right edge)
    const rightSide = createRightSide(
        team.name,
        logoUrl,
        qrCodeUrl
    );

    return createFoldableCardContainer(leftSide, rightSide);
};