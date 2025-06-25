// src/core/game/MultiSelectChallengeTracker.ts
// PRODUCTION: Configuration for challenges that allow multiple option selection

export interface MultiSelectRule {
    challengeId: string;
    allowedCombinations: string[][];
    description: string;
}

export class MultiSelectChallengeTracker {

    private static readonly MULTI_SELECT_RULES: MultiSelectRule[] = [
        {
            challengeId: 'ch5', // Capacity Crisis
            allowedCombinations: [
                ['A'], ['B'], ['C'], ['D'], // Single selections
                ['A', 'C'], ['B', 'C']     // Allowed combinations
            ],
            description: 'Can combine A+C (hire manager + bonus) or B+C (hire temps + bonus)'
        }
        // Future multi-select challenges go here
    ];

    /**
     * Check if a challenge allows multiple selections
     */
    static isMultiSelectChallenge(challengeId: string): boolean {
        return this.MULTI_SELECT_RULES.some(rule => rule.challengeId === challengeId);
    }

    /**
     * Get allowed combinations for a challenge
     */
    static getAllowedCombinations(challengeId: string): string[][] {
        const rule = this.MULTI_SELECT_RULES.find(r => r.challengeId === challengeId);
        return rule?.allowedCombinations || [];
    }

    /**
     * Validate if a selection combination is allowed
     */
    static isValidCombination(challengeId: string, selectedOptions: string[]): boolean {
        const allowedCombinations = this.getAllowedCombinations(challengeId);

        // Sort both arrays for comparison
        const sortedSelected = [...selectedOptions].sort();

        return allowedCombinations.some(combo => {
            const sortedCombo = [...combo].sort();
            return sortedSelected.length === sortedCombo.length &&
                sortedSelected.every((option, index) => option === sortedCombo[index]);
        });
    }

    /**
     * Parse comma-separated selection string to array
     */
    static parseSelection(selectionString: string | null): string[] {
        if (!selectionString) return [];
        return selectionString.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    /**
     * Convert array of selections to comma-separated string
     */
    static formatSelection(selectedOptions: string[]): string {
        return selectedOptions.sort().join(',');
    }

    /**
     * Get display text for a combination
     */
    static getCombinationDisplayText(selectedOptions: string[]): string {
        if (selectedOptions.length === 0) return 'No selection';
        if (selectedOptions.length === 1) return `Option ${selectedOptions[0]}`;
        return `Options ${selectedOptions.sort().join(' + ')}`;
    }

    /**
     * Determine which consequence slide should process which team selection
     */
    static shouldSlideProcessSelection(slideId: number, teamSelection: string): boolean {
        // Map slide IDs to the selections they should process
        // This is CH5-specific logic but can be extended for other multi-select challenges
        const slideSelectionMap: Record<number, string[]> = {
            93: ['A', 'A,C'],    // Slide 93 processes A alone and A+C combination
            94: ['B', 'B,C'],    // Slide 94 processes B alone and B+C combination
            95: ['C'],           // Slide 95 processes C alone only
            96: ['D']            // Slide 96 processes D alone only
        };

        const selectionsForSlide = slideSelectionMap[slideId] || [];
        return selectionsForSlide.includes(teamSelection);
    }
}
