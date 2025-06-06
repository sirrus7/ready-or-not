export interface TeamConfig {
    name: string;
    members?: string[];
    category?: string;
    id?: string;
}

export interface PDFConfig {
    orientation: 'portrait' | 'landscape';
    unit: 'in' | 'mm' | 'cm' | 'pt';
    format: string | [number, number];
    scale: number;
    width: number;
    height: number;
    backgroundColor?: string;
}

export interface TeamCardAssets {
    logoUrl?: string;
    generateQRCode?: (team: TeamConfig) => string;
}

export interface ProcessedTeamAssets {
    qrCodeUrl?: string;
}