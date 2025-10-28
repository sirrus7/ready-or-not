// src/core/game/GameVersionManager.ts
import {GameStructure, GameVersion} from '@shared/types/game';
import {
    readyOrNotGame_1_5_NO_DD,
    readyOrNotGame_1_5_DD,
    readyOrNotGame_2_0_NO_DD,
    readyOrNotGame_2_0_DD,
} from '@core/content/GameStructure';

/**
 * Centralized game version management
 * Single source of truth for game versions and their structures
 */



// Map of versions to their display names
export const GAME_VERSION_DISPLAY_NAMES: Record<GameVersion, string> = {
    [GameVersion.V1_5_NO_DD]: 'Ready Or Not 1.5 (without Double Down)',
    [GameVersion.V1_5_DD]: 'Ready Or Not 1.5 (with Double Down)',
    [GameVersion.V2_0_NO_DD]: 'Ready Or Not 2.0 (without Double Down)',
    [GameVersion.V2_0_DD]: 'Ready Or Not 2.0 (with Double Down)'
};

// Map of versions to their game structures
const GAME_STRUCTURES: Record<GameVersion, GameStructure> = {
    [GameVersion.V1_5_NO_DD]: readyOrNotGame_1_5_NO_DD,
    [GameVersion.V1_5_DD]: readyOrNotGame_1_5_DD,
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

        // Support old versions of 1.5 games
        if (version === "1.5")
            return GAME_STRUCTURES[GameVersion.V1_5_DD]

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

    static getDisplayVersion(version: string): string {
        switch (version){
            case GameVersion.V1_5_DD:
                return "v1.5 DD";
            case GameVersion.V1_5_NO_DD:
                return "v1.5";
            case GameVersion.V2_0_DD:
                return "v2.0 DD";
            case GameVersion.V2_0_NO_DD:
                return "v2.0";
            default:
                return version;
        }
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
        return version === GameVersion.V2_0_DD || version == GameVersion.V1_5_DD;
    }

    /**
     * Check if a version uses virtual host
     */
    static hasVirtualHost(version: string): boolean {
        return version !== GameVersion.V1_5_DD && version !== GameVersion.V1_5_NO_DD;
    }
}
