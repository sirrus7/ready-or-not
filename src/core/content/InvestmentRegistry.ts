// src/core/content/InvestmentRegistry.ts
// Complete slide-to-investment mapping for payoff processing

/**
 * Maps payoff slide IDs to their corresponding investment IDs
 * This enables slide-specific payoff processing where each slide only affects
 * teams that selected that specific investment
 */
export const SLIDE_TO_INVESTMENT_MAP = new Map<number, string>([
    // ===== ROUND 1 PAYOFFS (Slides 56-61) =====
    [56, 'rd1_inv_biz_growth'],          // Business Growth Strategy
    [57, 'rd1_inv_prod_effic'],          // Production Efficiency
    [58, 'rd1_inv_add_shift'],           // Add Shift
    [59, 'rd1_inv_supply_chain_opt'],    // Supply Chain Optimization
    [60, 'rd1_inv_emp_dev'],             // Employee Development
    [61, 'rd1_inv_boutique'],            // Maximize Sales Boutique

    // ===== ROUND 2 PAYOFFS (Slides 126-137) =====
    [126, 'rd2_inv_strategic_plan_2'],        // Business Growth Strategy
    [127, 'rd2_inv_prod_efficiency_2'],       // Production Efficiency
    [128, 'rd2_inv_add_exp_2nd_shift'],       // 2nd Shift Expansion
    [129, 'rd2_inv_supply_chain_opt_2'],      // Supply Chain Optimization
    [130, 'rd2_inv_emp_dev_2'],              // Employee Development
    [131, 'rd2_inv_maximize_boutique'],       // Maximize Boutique
    [132, 'rd2_inv_expand_dist_channels'],    // Big Box Expansion
    [133, 'rd2_inv_erp'],                    // ERP
    [134, 'rd2_inv_it_cybersecurity'],       // IT Security
    [135, 'rd2_inv_prod_line_expansion'],     // Product Line
    [136, 'rd2_inv_automation_cobots'],       // Automation
    [137, 'rd2_inv_market_share_attack'],     // Market Share Attack

    // ===== ROUND 3 PAYOFFS (Slides 170-181) =====
    [170, 'rd3_inv_strategic_plan_2'],        // Business Growth Strategy
    [171, 'rd3_inv_prod_efficiency_3'],       // Production Efficiency
    [172, 'rd3_inv_3rd_shift'],              // 3rd Shift
    [173, 'rd3_inv_supply_chain_opt_3'],      // Supply Chain Optimization
    [174, 'rd3_inv_emp_dev_3'],              // Employee Development
    [175, 'rd3_inv_maximize_boutique_3'],     // Maximize Boutique
    [176, 'rd3_inv_expand_dist_channels_3'],  // Big Box
    [177, 'rd3_inv_erp_3'],                  // ERP
    [178, 'rd3_inv_it_cybersecurity_3'],      // IT Security
    [179, 'rd3_inv_prod_line_expansion_3'],   // Product Line
    [180, 'rd3_inv_automation_cobots_3'],     // Automation
    [181, 'rd3_inv_strategic_acquisition'],   // Strategic Acquisition
]);

/**
 * Get the investment ID for a given payoff slide
 */
export function getInvestmentForSlide(slideId: number): string | null {
    return SLIDE_TO_INVESTMENT_MAP.get(slideId) || null;
}

/**
 * Check if a slide is a payoff slide
 */
export function isPayoffSlide(slideId: number): boolean {
    return SLIDE_TO_INVESTMENT_MAP.has(slideId);
}

/**
 * Get all payoff slides for a specific round
 */
export function getPayoffSlidesForRound(roundNumber: 1 | 2 | 3): number[] {
    const slides: number[] = [];

    SLIDE_TO_INVESTMENT_MAP.forEach((investmentId, slideId) => {
        if (investmentId.startsWith(`rd${roundNumber}_inv_`)) {
            slides.push(slideId);
        }
    });

    return slides.sort((a, b) => a - b);
}

/**
 * Get the round number for a payoff slide
 */
export function getRoundForPayoffSlide(slideId: number): 1 | 2 | 3 | null {
    const investmentId = SLIDE_TO_INVESTMENT_MAP.get(slideId);
    if (!investmentId) return null;

    if (investmentId.startsWith('rd1_inv_')) return 1;
    if (investmentId.startsWith('rd2_inv_')) return 2;
    if (investmentId.startsWith('rd3_inv_')) return 3;

    return null;
}

/**
 * Investment names for display purposes
 */
export const INVESTMENT_DISPLAY_NAMES = new Map<string, string>([
    // Round 1
    ['rd1_inv_biz_growth', 'Business Growth Strategy'],
    ['rd1_inv_prod_effic', 'Production Efficiency'],
    ['rd1_inv_add_shift', 'Add Shift'],
    ['rd1_inv_supply_chain_opt', 'Supply Chain Optimization'],
    ['rd1_inv_emp_dev', 'Employee Development'],
    ['rd1_inv_boutique', 'Maximize Sales Boutique'],

    // Round 2
    ['rd2_inv_strategic_plan_2', 'Business Growth Strategy'],
    ['rd2_inv_prod_efficiency_2', 'Production Efficiency'],
    ['rd2_inv_add_exp_2nd_shift', '2nd Shift Expansion'],
    ['rd2_inv_supply_chain_opt_2', 'Supply Chain Optimization'],
    ['rd2_inv_emp_dev_2', 'Employee Development'],
    ['rd2_inv_maximize_boutique', 'Maximize Boutique'],
    ['rd2_inv_expand_dist_channels', 'Big Box Expansion'],
    ['rd2_inv_erp', 'ERP'],
    ['rd2_inv_it_cybersecurity', 'IT Security'],
    ['rd2_inv_prod_line_expansion', 'Product Line'],
    ['rd2_inv_automation_cobots', 'Automation'],
    ['rd2_inv_market_share_attack', 'Market Share Attack'],

    // Round 3
    ['rd3_inv_strategic_plan_2', 'Business Growth Strategy'],
    ['rd3_inv_prod_efficiency_3', 'Production Efficiency'],
    ['rd3_inv_3rd_shift', '3rd Shift'],
    ['rd3_inv_supply_chain_opt_3', 'Supply Chain Optimization'],
    ['rd3_inv_emp_dev_3', 'Employee Development'],
    ['rd3_inv_maximize_boutique_3', 'Maximize Boutique'],
    ['rd3_inv_expand_dist_channels_3', 'Big Box'],
    ['rd3_inv_erp_3', 'ERP'],
    ['rd3_inv_it_cybersecurity_3', 'IT Security'],
    ['rd3_inv_prod_line_expansion_3', 'Product Line'],
    ['rd3_inv_automation_cobots_3', 'Automation'],
    ['rd3_inv_strategic_acquisition', 'Strategic Acquisition'],
]);

/**
 * Get display name for an investment
 */
export function getInvestmentDisplayName(investmentId: string): string {
    return INVESTMENT_DISPLAY_NAMES.get(investmentId) || investmentId;
}
