import { PDFConfig } from './types';

export const DEFAULT_CONFIG: PDFConfig = {
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
    scale: 3,
    width: 680,
    height: 880,
};

export const QR_CODE_OPTIONS = {
    errorCorrectionLevel: 'M' as const,
    type: 'image/png' as const,
    quality: 0.92,
    margin: 1,
    color: {
        dark: '#000000',
        light: '#FFFFFF'
    },
    width: 200
};