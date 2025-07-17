// src/core/content/DoubleDownAudioMapping.ts
import {SLIDE_TO_INVESTMENT_MAP} from './DoubleDownMapping';

export interface DoubleDownAudioConfig {
    introAudio: string;
    resultAudioPrefix: string;
}

// Map investment IDs to their audio files (based on actual file structure)
export const INVESTMENT_AUDIO_MAP: Record<string, DoubleDownAudioConfig> = {
    'B': {  // Changed from 'PE' to 'B' (Production Efficiency)
        introAudio: 'double-down/DDProdEff.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'C': {  // Changed from 'ES' to 'C' (Expanded 2nd Shift)
        introAudio: 'double-down/DD2ndShift.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'D': {  // Changed from 'SCO' to 'D' (Supply Chain Optimization)
        introAudio: 'double-down/DDSupChain.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'E': {  // Changed from 'ED' to 'E' (Employee Development)
        introAudio: 'double-down/DDEmpDev.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'F': {  // Changed from 'MBS' to 'F' (Maximize Boutique Sales)
        introAudio: 'double-down/DDMaxBout.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'G': {  // Changed from 'EBB' to 'G' (Expand Distribution - Big Box)
        introAudio: 'double-down/DDBigBox.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'H': {  // Changed from 'ERP' to 'H' (Enterprise Resource Planning)
        introAudio: 'double-down/DDERP.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'I': {  // Changed from 'ITS' to 'I' (IT & Cybersecurity)
        introAudio: 'double-down/DDIT.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'J': {  // Changed from 'PLE' to 'J' (Product Line Expansion)
        introAudio: 'double-down/DDProdLineExp.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'K': {  // Changed from 'AC' to 'K' (Automation & Co-Bots)
        introAudio: 'double-down/DDAutomation.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    }
};

// Helper functions
export function getIntroAudioPath(investmentId: string): string | null {
    const config = INVESTMENT_AUDIO_MAP[investmentId];
    return config?.introAudio || null;
}

export function getResultAudioPath(investmentId: string, diceTotal: number): string | null {
    const config = INVESTMENT_AUDIO_MAP[investmentId];
    if (!config || diceTotal < 2 || diceTotal > 12) return null;

    return `${config.resultAudioPrefix}${diceTotal}.mp4`;
}

export function getAudioForSlide(slideId: number): DoubleDownAudioConfig | null {
    const investment = SLIDE_TO_INVESTMENT_MAP[slideId];
    if (!investment) return null;

    return INVESTMENT_AUDIO_MAP[investment.id] || null;
}
