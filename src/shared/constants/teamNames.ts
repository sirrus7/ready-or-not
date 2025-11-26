// src/shared/constants/teamNames.ts

export const DEFAULT_TEAM_NAMES: string[] = [
    'CRANE', 'WILLOW', 'BIGHORN', 'OSPREY', 'YEW', 'LAUREL', 'MAPLE', 'HEMLOCK', 'OWL', 'ELM',
    'CYPRESS', 'BOXELDER', 'PLUM', 'DOGWOOD', 'ELK', 'ASH', 'ASPEN', 'BIRCH', 'FILBERT', 'FIR',
    'JUNIPER', 'LARCH', 'OAK', 'PEAR', 'PINE', 'SPRUCE', 'CHUKAR', 'BRANT', 'EAGLE', 'SWIFT',
    'HERON', 'EGRET', 'RAVEN', 'CROW', 'JAY', 'FALCON', 'TOWIE', 'DOVE', 'PLOVER', 'AVOCET',
    'WILLET', 'SNAKE', 'ROGUE', 'ALSEA', 'TRASK', 'WILSON', 'CHETCO', 'SANDY', 'HOOD', 'UMPQUA',
    'SILETZ', 'OWYHEE'
];

/**
 * Get the next available team name that isn't already in use
 */
export const getNextAvailableTeamName = (existingTeamNames: string[]): string => {
    const existingNamesUpper = new Set(existingTeamNames.map(name => name.toUpperCase()));

    // First, try to find an unused name from the default list
    const availableName = DEFAULT_TEAM_NAMES.find(name => !existingNamesUpper.has(name.toUpperCase()));
    if (availableName) {
        return availableName;
    }

    // Fallback: generate "Team X" where X is a letter
    let letterIndex = 0;
    while (letterIndex < 26) {
        const fallbackName = `Team ${String.fromCharCode(65 + letterIndex)}`;
        if (!existingNamesUpper.has(fallbackName.toUpperCase())) {
            return fallbackName;
        }
        letterIndex++;
    }

    // Last resort: use number suffix
    return `Team ${existingTeamNames.length + 1}`;
};
