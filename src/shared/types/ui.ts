// src/shared/types/ui.ts
// These types are primarily used in UI components, forms, or wizard steps

// Use 'import type' for type-only imports
// Currently using direct literal string types for game_version, so 'GameVersion' not needed yet.

export interface TeamConfig {
    name: string;
    passcode: string;
}

export interface NewGameData {
    game_version: '2.0_dd' | '1.5_dd'; // Direct literal type as seen in GameStructure.ts
    name: string;
    class_name: string;
    grade_level: string;
    num_players: number;
    num_teams: number;
    teams_config?: TeamConfig[];
}
