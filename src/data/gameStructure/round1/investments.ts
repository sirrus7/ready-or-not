// src/data/gameStructure/round1/investments.ts
import { InvestmentOption } from '../../../types';

export const round1InvestmentOptions: Record<string, InvestmentOption[]> = {
    'rd1-invest': [
        {
            id: 'rd1_inv_biz_growth',
            name: "1. Biz Growth Strat.",
            cost: 50000,
            description: "Invest in new market research and sales channels to increase orders and potentially ASP."
        },
        {
            id: 'rd1_inv_prod_effic',
            name: "2. Prod. Efficiency",
            cost: 100000,
            description: "Upgrade tools and streamline assembly processes to boost capacity."
        },
        {
            id: 'rd1_inv_2nd_shift',
            name: "3. Add 2nd Shift",
            cost: 50000,
            description: "Hire and train staff for a second production shift, increasing capacity but also costs."
        },
        {
            id: 'rd1_inv_sup_chain',
            name: "4. Supply Chain Opt.",
            cost: 75000,
            description: "Negotiate better supplier terms and improve logistics for cost savings and minor capacity gains."
        },
        {
            id: 'rd1_inv_emp_dev',
            name: "5. Employee Dev.",
            cost: 50000,
            description: "Invest in training programs for current employees to improve efficiency and capacity."
        },
        {
            id: 'rd1_inv_boutique',
            name: "6. Maximize Sales (Boutique)",
            cost: 100000,
            description: "Open a small boutique retail store to directly reach customers, increasing orders and ASP."
        },
    ],
};