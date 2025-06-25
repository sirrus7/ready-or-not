// src/utils/InvestmentDisplayUtils.ts
/**
 * Utility for converting investment display between letters and numbers
 * - Backend continues to use letters (A, B, C, etc.) for all logic
 * - Frontend displays numbers (1, 2, 3, etc.) only for investment phases
 * - Challenges continue to use letters
 */
export class InvestmentDisplayUtils {
    /**
     * Convert letter to number for investment display
     * A -> 1, B -> 2, C -> 3, etc.
     */
    static letterToNumber(letter: string): string {
        if (!letter) return '';
        return (letter.toUpperCase().charCodeAt(0) - 64).toString();
    }

    /**
     * Convert number to letter for backend processing
     * 1 -> A, 2 -> B, 3 -> C, etc.
     */
    static numberToLetter(number: string | number): string {
        const num = typeof number === 'string' ? parseInt(number) : number;
        if (num < 1 || num > 26) return '';
        return String.fromCharCode(64 + num);
    }

    /**
     * Check if current phase/slideType is an investment phase
     */
    static isInvestmentPhase(phaseId?: string, slideType?: string): boolean {
        if (slideType === 'interactive_invest' || slideType === 'payoff_reveal') return true;
        return !!(phaseId?.includes('invest') || phaseId?.includes('rd'));

    }

    /**
     * Get display ID for an investment option
     */
    static getDisplayId(optionId: string, isInvestment: boolean = true): string {
        return isInvestment ? this.letterToNumber(optionId) : optionId;
    }
}
