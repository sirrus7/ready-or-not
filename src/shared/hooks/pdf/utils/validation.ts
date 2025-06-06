import { TeamConfig, PDFConfig } from '../types';

export const validateTeams = (teams: TeamConfig[]): void => {
    if (!teams || teams.length === 0) {
        throw new Error('No teams provided for name card generation.');
    }
};

export const validateConfig = (config: PDFConfig): void => {
    if (config.width <= 0 || config.height <= 0) {
        throw new Error('Invalid dimensions in PDF config');
    }
    if (config.scale <= 0) {
        throw new Error('Invalid scale in PDF config');
    }
};