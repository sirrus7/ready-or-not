// src/shared/utils/audio/DoubleDownAudioManager.ts
import {mediaManager} from '@shared/services/MediaManager';
import {getIntroAudioPath, getResultAudioPath} from '@core/content/DoubleDownAudioMapping';

interface AudioInstance {
    intro: HTMLAudioElement | null;
    result: HTMLAudioElement | null;
}

/**
 * DoubleDownAudioManager - Utility class for managing double down audio playback
 * Follows the same singleton pattern as MediaManager for consistency
 */
class DoubleDownAudioManager {
    private static instance: DoubleDownAudioManager;
    private audioInstances = new Map<string, AudioInstance>();

    private constructor() {
    }

    public static getInstance(): DoubleDownAudioManager {
        if (!DoubleDownAudioManager.instance) {
            DoubleDownAudioManager.instance = new DoubleDownAudioManager();
        }
        return DoubleDownAudioManager.instance;
    }

    /**
     * Load and cache intro audio for a specific investment
     * @param investmentId - The investment ID (e.g., 'PE', 'ERP', etc.)
     * @returns Promise<boolean> - Success status
     */
    public async loadIntroAudio(investmentId: string): Promise<boolean> {
        try {
            const introPath = getIntroAudioPath(investmentId);
            if (!introPath) {
                console.warn(`[DoubleDownAudioManager] No intro audio path found for investment: ${investmentId}`);
                return false;
            }

            const mediaManagerInstance = mediaManager;
            const introUrl = await mediaManagerInstance.getSignedUrl(introPath);

            // Get or create audio instance for this investment
            if (!this.audioInstances.has(investmentId)) {
                this.audioInstances.set(investmentId, {intro: null, result: null});
            }

            const audioInstance = this.audioInstances.get(investmentId)!;

            // Clean up existing intro audio
            if (audioInstance.intro) {
                audioInstance.intro.pause();
                audioInstance.intro = null;
            }

            // Create new audio instance
            audioInstance.intro = new Audio(introUrl);
            audioInstance.intro.preload = 'auto';

            console.log(`[DoubleDownAudioManager] Loaded intro audio for ${investmentId}`);
            return true;
        } catch (error) {
            console.error(`[DoubleDownAudioManager] Failed to load intro audio for ${investmentId}:`, error);
            return false;
        }
    }

    /**
     * Play intro audio for a specific investment
     * @param investmentId - The investment ID
     * @returns Promise<boolean> - Success status
     */
    public async playIntroAudio(investmentId: string): Promise<boolean> {
        try {
            const audioInstance = this.audioInstances.get(investmentId);
            if (!audioInstance?.intro) {
                console.warn(`[DoubleDownAudioManager] No intro audio loaded for investment: ${investmentId}`);
                return false;
            }

            await audioInstance.intro.play();
            console.log(`[DoubleDownAudioManager] Playing intro audio for ${investmentId}`);
            return true;
        } catch (error) {
            console.error(`[DoubleDownAudioManager] Failed to play intro audio for ${investmentId}:`, error);
            return false;
        }
    }

    /**
     * Play result audio for a specific dice total
     * @param investmentId - The investment ID (used for logging context)
     * @param diceTotal - The dice total (2-12)
     * @returns Promise<boolean> - Success status
     */
    public async playResultAudio(investmentId: string, diceTotal: number): Promise<boolean> {
        try {
            const resultPath = getResultAudioPath(investmentId, diceTotal);
            if (!resultPath) {
                console.warn(`[DoubleDownAudioManager] No result audio path found for total: ${diceTotal}`);
                return false;
            }

            const mediaManagerInstance = mediaManager;
            const resultUrl = await mediaManagerInstance.getSignedUrl(resultPath);

            // Get or create audio instance for this investment
            if (!this.audioInstances.has(investmentId)) {
                this.audioInstances.set(investmentId, {intro: null, result: null});
            }

            const audioInstance = this.audioInstances.get(investmentId)!;

            // Clean up existing result audio
            if (audioInstance.result) {
                audioInstance.result.pause();
                audioInstance.result = null;
            }

            // Create and play new result audio
            audioInstance.result = new Audio(resultUrl);
            await audioInstance.result.play();

            console.log(`[DoubleDownAudioManager] Playing result audio for total ${diceTotal} (${investmentId})`);
            return true;
        } catch (error) {
            console.error(`[DoubleDownAudioManager] Failed to play result audio for ${investmentId} total ${diceTotal}:`, error);
            return false;
        }
    }

    /**
     * Clean up audio resources for a specific investment
     * @param investmentId - The investment ID
     */
    public cleanupAudio(investmentId: string): void {
        const audioInstance = this.audioInstances.get(investmentId);
        if (audioInstance) {
            if (audioInstance.intro) {
                audioInstance.intro.pause();
                audioInstance.intro = null;
            }
            if (audioInstance.result) {
                audioInstance.result.pause();
                audioInstance.result = null;
            }
            this.audioInstances.delete(investmentId);
        }
        console.log(`[DoubleDownAudioManager] Cleaned up audio for ${investmentId}`);
    }

    /**
     * Clean up all audio resources
     */
    public cleanupAll(): void {
        this.audioInstances.forEach((_, investmentId) => {
            this.cleanupAudio(investmentId);
        });
        console.log('[DoubleDownAudioManager] Cleaned up all audio resources');
    }
}

export default DoubleDownAudioManager;
