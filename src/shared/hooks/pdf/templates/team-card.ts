import { TeamConfig } from '../types';
import {
    createTopHalf,
    createBottomHalf,
    createFoldableCardContainer
} from './sections';

export const generateTeamCardHTML = (
    team: TeamConfig,
    logoUrl?: string,
    qrCodeUrl?: string
): string => {
    // Top half: Logo and Team Name
    const topHalf = createTopHalf(
        team.name,
        logoUrl,
        false // no QR code
    );

    // Bottom half: QR Code, Team Name, and Logo (rotated 180 degrees)
    const bottomHalf = createBottomHalf(
        team.name,
        logoUrl,
        true, // show QR code
        qrCodeUrl
    );

    return createFoldableCardContainer(topHalf, bottomHalf);
};