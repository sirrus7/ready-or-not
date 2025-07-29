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
    private audioInstances: Map<string, AudioInstance> = new Map<string, AudioInstance>();
    private resultAudioCache: Map<string, string> = new Map<string, string>(); // Maps "investmentId-diceTotal" to blob URL
    private hasLoadedAllAudio: boolean = false;
    private isLoadingAllAudio: boolean = false;

    private constructor() {
    }

    public static getInstance(): DoubleDownAudioManager {
        if (!DoubleDownAudioManager.instance) {
            DoubleDownAudioManager.instance = new DoubleDownAudioManager();
        }
        return DoubleDownAudioManager.instance;
    }

    /**
     * Load ALL double down audio files once and cache them for the entire session
     */
    public async loadAllDoubleDownAudio(): Promise<void> {
        if (this.hasLoadedAllAudio) {
            console.log('[DoubleDownAudioManager] All audio already loaded - skipping');
            return;
        }

        if (this.isLoadingAllAudio) {
            console.log('[DoubleDownAudioManager] Audio loading already in progress - skipping duplicate request');
            return;
        }

        this.isLoadingAllAudio = true;
        console.log('[DoubleDownAudioManager] Loading all Double Down audio files...');

        try {
            const investments: string[] = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

            for (const investmentId of investments) {
                // Load intro
                await this.loadIntroAudio(investmentId).catch((err: Error) =>
                    console.warn(`Failed to load intro for ${investmentId}:`, err)
                );

                // Load all results for this investment
                for (let diceTotal: number = 2; diceTotal <= 12; diceTotal++) {
                    await this.loadSingleResultAudio(investmentId, diceTotal).catch((err: Error) =>
                        console.warn(`Failed to load result ${diceTotal} for ${investmentId}:`, err)
                    );
                }
            }

            this.hasLoadedAllAudio = true;
            console.log('[DoubleDownAudioManager] Finished loading all Double Down audio');
        } finally {
            this.isLoadingAllAudio = false;
        }
    }

    /**
     * Load and cache intro audio for a specific investment
     * Downloads the file as a blob to avoid JWT expiration during playback
     */
    public async loadIntroAudio(investmentId: string): Promise<boolean> {
        // Check if already loaded
        const audioInstance: AudioInstance | undefined = this.audioInstances.get(investmentId);
        if (audioInstance?.intro) {
            console.log(`[DoubleDownAudioManager] Intro audio already loaded for ${investmentId}`);
            return true;
        }

        const timeoutMs: number = 10000; // 10 second timeout

        return new Promise<boolean>((resolve: (value: boolean) => void) => {
            const timeout: NodeJS.Timeout = setTimeout(() => {
                console.warn(`[DoubleDownAudioManager] Timeout loading audio for ${investmentId}, but continuing anyway`);
                resolve(false);
            }, timeoutMs);

            (async (): Promise<void> => {
                try {
                    const introPath: string | null = getIntroAudioPath(investmentId);
                    if (!introPath) {
                        console.warn(`[DoubleDownAudioManager] No intro audio path found for investment: ${investmentId}`);
                        clearTimeout(timeout);
                        resolve(false);
                        return;
                    }

                    // Get signed URL
                    const introUrl: string = await mediaManager.getSignedUrl(introPath);

                    // Fetch the audio file as a blob immediately
                    const response: Response = await fetch(introUrl);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch audio: ${response.status}`);
                    }

                    const audioBlob: Blob = await response.blob();
                    const blobUrl: string = URL.createObjectURL(audioBlob);

                    // Get or create audio instance for this investment
                    if (!this.audioInstances.has(investmentId)) {
                        this.audioInstances.set(investmentId, {intro: null, result: null});
                    }

                    const currentAudioInstance: AudioInstance = this.audioInstances.get(investmentId)!;

                    // Clean up existing intro audio and its blob URL
                    if (currentAudioInstance.intro) {
                        currentAudioInstance.intro.pause();
                        if (currentAudioInstance.intro.src.startsWith('blob:')) {
                            URL.revokeObjectURL(currentAudioInstance.intro.src);
                        }
                        currentAudioInstance.intro = null;
                    }

                    // Create new audio instance with blob URL
                    currentAudioInstance.intro = new Audio(blobUrl);
                    currentAudioInstance.intro.preload = 'auto';

                    clearTimeout(timeout);
                    console.log(`[DoubleDownAudioManager] Loaded intro audio for ${investmentId}`);
                    resolve(true);
                } catch (error: unknown) {
                    clearTimeout(timeout);
                    console.error(`[DoubleDownAudioManager] Failed to load intro audio for ${investmentId}:`, error);
                    resolve(false);
                }
            })();
        });
    }

    /**
     * Play intro audio for a specific investment
     */
    public async playIntroAudio(investmentId: string): Promise<boolean> {
        try {
            const audioInstance: AudioInstance | undefined = this.audioInstances.get(investmentId);
            if (!audioInstance?.intro) {
                console.warn(`[DoubleDownAudioManager] No intro audio loaded for investment: ${investmentId}`);
                return false;
            }

            await audioInstance.intro.play();
            console.log(`[DoubleDownAudioManager] Playing intro audio for ${investmentId}`);
            return true;
        } catch (error: unknown) {
            console.error(`[DoubleDownAudioManager] Failed to play intro audio for ${investmentId}:`, error);
            return false;
        }
    }

    /**
     * Load a single result audio file and cache as blob
     */
    private async loadSingleResultAudio(investmentId: string, diceTotal: number): Promise<boolean> {
        // Check if already loaded
        const cacheKey: string = `${investmentId}-${diceTotal}`;
        if (this.resultAudioCache.has(cacheKey)) {
            console.log(`[DoubleDownAudioManager] Result audio already loaded for ${investmentId} total ${diceTotal}`);
            return true;
        }

        try {
            const resultPath: string | null = getResultAudioPath(investmentId, diceTotal);
            if (!resultPath) {
                console.warn(`[DoubleDownAudioManager] No result audio path found for ${investmentId} total ${diceTotal}`);
                return false;
            }

            const resultUrl: string = await mediaManager.getSignedUrl(resultPath);

            const response: Response = await fetch(resultUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const audioBlob: Blob = await response.blob();

            // Verify it's actually audio/video content
            if (!audioBlob.type.startsWith('audio/') && !audioBlob.type.startsWith('video/')) {
                console.warn(`[DoubleDownAudioManager] Unexpected content type ${audioBlob.type} for ${resultPath}`);
            }

            const blobUrl: string = URL.createObjectURL(audioBlob);
            this.resultAudioCache.set(cacheKey, blobUrl);

            console.log(`[DoubleDownAudioManager] Successfully loaded result audio for ${investmentId} total ${diceTotal}`);
            return true;
        } catch (error: unknown) {
            console.error(`[DoubleDownAudioManager] Failed to load result audio for ${investmentId} total ${diceTotal}:`, error);
            return false;
        }
    }

    /**
     * Play result audio for a specific dice total using pre-loaded audio
     */
    public async playResultAudio(investmentId: string, diceTotal: number): Promise<boolean> {
        try {
            const cacheKey: string = `${investmentId}-${diceTotal}`;
            const blobUrl: string | undefined = this.resultAudioCache.get(cacheKey);

            if (!blobUrl) {
                console.warn(`[DoubleDownAudioManager] No pre-loaded result audio found for ${investmentId} total ${diceTotal}`);
                return false;
            }

            // Create and play audio from pre-loaded blob
            const audio: HTMLAudioElement = new Audio(blobUrl);
            await audio.play();

            console.log(`[DoubleDownAudioManager] Playing result audio for total ${diceTotal} (${investmentId})`);
            return true;
        } catch (error: unknown) {
            console.error(`[DoubleDownAudioManager] Failed to play result audio for ${investmentId} total ${diceTotal}:`, error);
            return false;
        }
    }
}

export default DoubleDownAudioManager;
