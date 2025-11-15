// src/shared/types/ui.ts
// These types are primarily used in UI components, forms, or wizard steps

import { GameVersion } from "./game";

export interface TeamConfig {
    name: string;
    passcode: string;
}

export interface NewGameData {
    game_version: GameVersion;
    name: string;
    class_name: string;
    grade_level: string;
    num_players: number;
    num_teams: number;
    teams_config?: TeamConfig[];
}
