// src/core/content/InvestmentRegistry.ts
// Investment registry following the same pattern as ChallengeRegistry

/**
 * Maps payoff slide IDs to their corresponding investment phase IDs
 * This follows the same pattern as SLIDE_TO_CHALLENGE_MAP in ChallengeRegistry
 */
export const SLIDE_TO_INVESTMENT_PHASE_MAP = new Map<number, string>([
    // ===== ROUND 1 INVESTMENT PAYOFFS (Slides 56-61) =====
    [56, 'rd1-invest'],   // A. Business Growth Strategy
    [57, 'rd1-invest'],   // B. Production Efficiency
    [58, 'rd1-invest'],   // C. Add Shift
    [59, 'rd1-invest'],   // D. Supply Chain Optimization
    [60, 'rd1-invest'],   // E. Employee Development
    [61, 'rd1-invest'],   // F. Maximize Sales Boutique

    // ===== ROUND 2 INVESTMENT PAYOFFS (Slides 126-137) =====
    [126, 'rd2-invest'],  // A. Business Growth Strategy
    [127, 'rd2-invest'],  // B. Production Efficiency
    [128, 'rd2-invest'],  // C. 2nd Shift Expansion
    [129, 'rd2-invest'],  // D. Supply Chain Optimization
    [130, 'rd2-invest'],  // E. Employee Development
    [131, 'rd2-invest'],  // F. Maximize Boutique
    [132, 'rd2-invest'],  // G. Big Box Expansion
    [133, 'rd2-invest'],  // H. ERP
    [134, 'rd2-invest'],  // I. IT Security
    [135, 'rd2-invest'],  // J. Product Line
    [136, 'rd2-invest'],  // K. Automation
    [137, 'rd2-invest'],  // Bonus: Production Efficiency Synergy
    [138, 'rd2-invest'],  // Bonus: Supply Chain + Distribution Channels

    // ===== ROUND 3 INVESTMENT PAYOFFS (Slides 170-181) =====
    [171, 'rd3-invest'],  // A. Business Growth Strategy
    [172, 'rd3-invest'],  // B. Production Efficiency
    [173, 'rd3-invest'],  // C. Expanded 2nd Shift
    [174, 'rd3-invest'],  // D. Supply Chain Optimization
    [175, 'rd3-invest'],  // E. Employee Development
    [176, 'rd3-invest'],  // F. Maximize Boutique Sales
    [177, 'rd3-invest'],  // G. Big Box Expansion
    [178, 'rd3-invest'],  // H. ERP
    [179, 'rd3-invest'],  // I. IT Security
    [180, 'rd3-invest'],  // J. Product Line Expansion
    [181, 'rd3-invest'],  // K. Automation & Co-Bots
]);

/**
 * Get the investment phase for a given payoff slide ID
 * This mirrors getChallengeBySlideId from ChallengeRegistry
 */
export function getInvestmentPhaseBySlideId(slideId: number): string | null {
    return SLIDE_TO_INVESTMENT_PHASE_MAP.get(slideId) || null;
}

/**
 * Check if a slide is a payoff slide
 */
export function isPayoffSlide(slideId: number): boolean {
    return SLIDE_TO_INVESTMENT_PHASE_MAP.has(slideId);
}

/**
 * Get all payoff slides for a specific investment phase
 */
export function getPayoffSlidesForPhase(phaseId: string): number[] {
    const slides: number[] = [];

    SLIDE_TO_INVESTMENT_PHASE_MAP.forEach((phase, slideId) => {
        if (phase === phaseId) {
            slides.push(slideId);
        }
    });

    return slides.sort((a, b) => a - b);
}

/**
 * Get the round number for an investment phase
 */
export function getRoundForInvestmentPhase(phaseId: string): 1 | 2 | 3 | null {
    if (phaseId === 'rd1-invest') return 1;
    if (phaseId === 'rd2-invest') return 2;
    if (phaseId === 'rd3-invest') return 3;
    return null;
}
