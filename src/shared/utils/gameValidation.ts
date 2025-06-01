// src/components/Host/CreateGame/Step1/utils/gameValidation.ts - Validation logic
import { NewGameData } from '@shared/types/common';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export const validateGameDetails = (gameData: NewGameData): ValidationResult => {
    if (!gameData.name?.trim()) {
        return { isValid: false, error: "Game Name is required." };
    }

    if (gameData.num_players < 2) {
        return { isValid: false, error: "Number of players must be at least 2." };
    }

    if (gameData.num_teams < 1) {
        return { isValid: false, error: "Number of teams must be at least 1." };
    }

    if (gameData.num_players < gameData.num_teams) {
        return { isValid: false, error: "Number of players cannot be less than the number of teams." };
    }

    return { isValid: true };
};
