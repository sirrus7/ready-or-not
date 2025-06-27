// src/core/content/DoubleDownMapping.ts
// Single source of truth for double down slide-to-investment mapping

export interface DoubleDownInvestment {
    id: string;
    name: string;
    slideId: number;
}

/**
 * SINGLE SOURCE OF TRUTH for double down investment mapping
 * This maps slide IDs to their corresponding investment data
 */
export const DOUBLE_DOWN_INVESTMENTS: DoubleDownInvestment[] = [
    {
        id: 'B',
        name: 'Production Efficiency',
        slideId: 185
    },
    {
        id: 'C',
        name: 'Expanded 2nd Shift',
        slideId: 186
    },
    {
        id: 'D',
        name: 'Supply Chain Optimization',
        slideId: 187
    },
    {
        id: 'E',
        name: 'Employee Development',
        slideId: 188
    },
    {
        id: 'F',
        name: 'Maximize Boutique Sales',
        slideId: 189
    },
    {
        id: 'G',
        name: 'Expand Distribution Channels: Big Box',
        slideId: 190
    },
    {
        id: 'H',
        name: 'Enterprise Resource Planning',
        slideId: 191
    },
    {
        id: 'I',
        name: 'IT & Cybersecurity',
        slideId: 192
    },
    {
        id: 'J',
        name: 'Product Line Expansion: Inflatables',
        slideId: 193
    },
    {
        id: 'K',
        name: 'Automation & Co-Bots',
        slideId: 194
    }
];

/**
 * Helper functions to work with the mapping
 */

// Get investment by slide ID
export const getInvestmentBySlideId = (slideId: number): DoubleDownInvestment | undefined => {
    return DOUBLE_DOWN_INVESTMENTS.find(inv => inv.slideId === slideId);
};

// Get investment by investment ID
export const getInvestmentById = (investmentId: string): DoubleDownInvestment | undefined => {
    return DOUBLE_DOWN_INVESTMENTS.find(inv => inv.id === investmentId);
};

// Get slide ID by investment ID
export const getSlideIdByInvestmentId = (investmentId: string): number | undefined => {
    return DOUBLE_DOWN_INVESTMENTS.find(inv => inv.id === investmentId)?.slideId;
};

// Create mapping objects for backward compatibility
export const SLIDE_TO_INVESTMENT_MAP: Record<number, { id: string; name: string }> =
    DOUBLE_DOWN_INVESTMENTS.reduce((acc, inv) => {
        acc[inv.slideId] = {id: inv.id, name: inv.name};
        return acc;
    }, {} as Record<number, { id: string; name: string }>);

export const INVESTMENT_TO_SLIDE_MAP: Record<string, { slideId: number; name: string }> =
    DOUBLE_DOWN_INVESTMENTS.reduce((acc, inv) => {
        acc[inv.id] = {slideId: inv.slideId, name: inv.name};
        return acc;
    }, {} as Record<string, { slideId: number; name: string }>);

// Validation function
export const validateDoubleDownMapping = (): boolean => {
    // Check for duplicate slide IDs
    const slideIds = DOUBLE_DOWN_INVESTMENTS.map(inv => inv.slideId);
    const uniqueSlideIds = new Set(slideIds);
    if (slideIds.length !== uniqueSlideIds.size) {
        console.error('[DoubleDownMapping] Duplicate slide IDs found!');
        return false;
    }

    // Check for duplicate investment IDs
    const investmentIds = DOUBLE_DOWN_INVESTMENTS.map(inv => inv.id);
    const uniqueInvestmentIds = new Set(investmentIds);
    if (investmentIds.length !== uniqueInvestmentIds.size) {
        console.error('[DoubleDownMapping] Duplicate investment IDs found!');
        return false;
    }

    // Check for expected range
    const expectedSlideIds = Array.from({length: 10}, (_, i) => 185 + i);
    const missingSlides = expectedSlideIds.filter(id => !slideIds.includes(id));
    if (missingSlides.length > 0) {
        console.error('[DoubleDownMapping] Missing slide IDs:', missingSlides);
        return false;
    }

    return true;
};

// Run validation in development
if (process.env.NODE_ENV === 'development') {
    validateDoubleDownMapping();
}
