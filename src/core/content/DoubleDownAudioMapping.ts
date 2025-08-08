// src/core/content/DoubleDownAudioMapping.ts
import {SLIDE_TO_INVESTMENT_MAP} from './DoubleDownMapping';

export interface DoubleDownAudioConfig {
    introAudio: string;
    // Remove resultAudioPrefix - it's the same for all
}

// Map investment IDs to their INTRO audio files only
export const INVESTMENT_AUDIO_MAP: Record<string, DoubleDownAudioConfig> = {
    'B': {introAudio: 'double-down/DDProdEff.mp4'},
    'C': {introAudio: 'double-down/DD2ndShift.mp4'},
    'D': {introAudio: 'double-down/DDSupChain.mp4'},
    'E': {introAudio: 'double-down/DDEmpDev.mp4'},
    'F': {introAudio: 'double-down/DDMaxBout.mp4'},
    'G': {introAudio: 'double-down/DDBigBox.mp4'},
    'H': {introAudio: 'double-down/DDERP.mp4'},
    'I': {introAudio: 'double-down/DDIT.mp4'},
    'J': {introAudio: 'double-down/DDProdLineExp.mp4'},
    'K': {introAudio: 'double-down/DDAutomation.mp4'}
};

// Helper functions
export function getIntroAudioPath(investmentId: string): string | null {
    const config = INVESTMENT_AUDIO_MAP[investmentId];
    return config?.introAudio || null;
}

// Result audio is shared by ALL investments
export function getResultAudioPath(diceTotal: number): string | null {
    if (diceTotal < 2 || diceTotal > 12) return null;
    return `double-down/results/DD${diceTotal}.mp4`;
}

export function getAudioForSlide(slideId: number): DoubleDownAudioConfig | null {
    const investment = SLIDE_TO_INVESTMENT_MAP[slideId];
    if (!investment) return null;
    return INVESTMENT_AUDIO_MAP[investment.id] || null;
}
