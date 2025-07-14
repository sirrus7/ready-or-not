// src/core/content/DoubleDownAudioMapping.ts
import {SLIDE_TO_INVESTMENT_MAP} from './DoubleDownMapping';

export interface DoubleDownAudioConfig {
    introAudio: string;
    resultAudioPrefix: string;
}

// Map investment IDs to their audio files (based on actual file structure)
export const INVESTMENT_AUDIO_MAP: Record<string, DoubleDownAudioConfig> = {
    'PE': {
        introAudio: 'double-down/DDProdEff.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'ES': {
        introAudio: 'double-down/DD2ndShift.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'SCO': {
        introAudio: 'double-down/DDSupChain.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'ED': {
        introAudio: 'double-down/DDEmpDev.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'MBS': {
        introAudio: 'double-down/DDMaxBout.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'EBB': {
        introAudio: 'double-down/DDBigBox.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'ERP': {
        introAudio: 'double-down/DDERP.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'ITS': {
        introAudio: 'double-down/DDIT.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'PLE': {
        introAudio: 'double-down/DDProdLineExp.mp4',
        resultAudioPrefix: 'double-down/results/DD'
    },
    'AC': {
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
