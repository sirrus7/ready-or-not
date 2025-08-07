// src/core/game/GameVersionManager.ts
import {GameStructure} from '@shared/types/game';
import {
    readyOrNotGame_1_5,
    readyOrNotGame_2_0_DD,
    readyOrNotGame_2_0_NO_DD
} from '@core/content/GameStructure';

/**
 * Centralized game version management
 * Single source of truth for game versions and their structures
 */

// Type-safe game version enum
export enum GameVersion {
    V1_5 = '1.5',
    V2_0_NO_DD = '2.0_no_dd',
    V2_0_DD = '2.0_dd'
}

// Map of versions to their display names
export const GAME_VERSION_DISPLAY_NAMES: Record<GameVersion, string> = {
    [GameVersion.V1_5]: 'Ready Or Not 1.5 (without virtual host)',
    [GameVersion.V2_0_NO_DD]: 'Ready Or Not 2.0 (without Double Down)',
    [GameVersion.V2_0_DD]: 'Ready Or Not 2.0 (with Double Down)'
};

// Map of versions to their game structures
const GAME_STRUCTURES: Record<GameVersion, GameStructure> = {
    [GameVersion.V1_5]: readyOrNotGame_1_5,
    [GameVersion.V2_0_NO_DD]: readyOrNotGame_2_0_NO_DD,
    [GameVersion.V2_0_DD]: readyOrNotGame_2_0_DD
};

export class GameVersionManager {
    /**
     * Get the game structure for a given version
     * @param version - The game version (from database)
     * @returns The corresponding GameStructure
     */
    static getGameStructure(version: string | null | undefined): GameStructure {
        // Default to 2.0 with DD if no version specified
        if (!version) {
            return GAME_STRUCTURES[GameVersion.V2_0_DD];
        }

        // Check if it's a valid version
        if (!this.isValidVersion(version)) {
            console.warn(`[GameVersionManager] Invalid version: ${version}, defaulting to 2.0 DD`);
            return GAME_STRUCTURES[GameVersion.V2_0_DD];
        }

        return GAME_STRUCTURES[version as GameVersion];
    }

    /**
     * Check if a version string is valid
     */
    static isValidVersion(version: string): version is GameVersion {
        return Object.values(GameVersion).includes(version as GameVersion);
    }

    /**
     * Get the display name for a version
     */
    static getDisplayName(version: string): string {
        if (!this.isValidVersion(version)) {
            return 'Unknown Version';
        }
        return GAME_VERSION_DISPLAY_NAMES[version as GameVersion];
    }

    /**
     * Get all available versions for dropdown menus
     */
    static getAllVersions(): Array<{ value: GameVersion; label: string }> {
        return Object.values(GameVersion).map(version => ({
            value: version,
            label: GAME_VERSION_DISPLAY_NAMES[version]
        }));
    }

    /**
     * Check if a version has double down feature
     */
    static hasDoubleDown(version: string): boolean {
        return version === GameVersion.V2_0_DD;
    }

    /**
     * Check if a version uses virtual host
     */
    static hasVirtualHost(version: string): boolean {
        return version !== GameVersion.V1_5;
    }
}
