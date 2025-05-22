// src/data/gameStructure/round3/investments.ts
import { InvestmentOption } from '../../../types';

export const round3InvestmentOptions: Record<string, InvestmentOption[]> = {
    'rd3-invest': [
        {
            id: 'rd3_inv_strategic_plan_2',
            name: "1. Strategic Plan II - 5 Year Vision",
            cost: 100000,
            description: "Develop comprehensive 5-year strategic vision with implementation roadmap."
        },
        {
            id: 'rd3_inv_prod_efficiency_3',
            name: "2. Production Efficiency III - Lean Manufacturing",
            cost: 250000,
            description: "Implement lean manufacturing principles and Six Sigma methodologies."
        },
        {
            id: 'rd3_inv_3rd_shift',
            name: "3. Add 3rd Shift - 24/7 Operations",
            cost: 125000,
            description: "Implement 24/7 operations with a third production shift."
        },
        {
            id: 'rd3_inv_supply_chain_3',
            name: "4. Supply Chain III - Vertical Integration",
            cost: 200000,
            description: "Vertically integrate key supply chain components for better control."
        },
        {
            id: 'rd3_inv_emp_dev_3',
            name: "5. Employee Development III - Leadership Program",
            cost: 150000,
            description: "Advanced leadership development and succession planning program."
        },
        {
            id: 'rd3_inv_premium_brand',
            name: "6. Premium Brand Development",
            cost: 175000,
            description: "Develop premium brand positioning and luxury product line."
        },
        {
            id: 'rd3_inv_global_expansion',
            name: "7. Global Market Expansion",
            cost: 300000,
            description: "Expand into international markets with localized strategies."
        },
        {
            id: 'rd3_inv_digital_transformation',
            name: "8. Digital Transformation Initiative",
            cost: 200000,
            description: "Comprehensive digital transformation including IoT and AI integration."
        },
        {
            id: 'rd3_inv_sustainability',
            name: "9. Sustainability & Green Manufacturing",
            cost: 175000,
            description: "Implement sustainable manufacturing practices and green technologies."
        },
        {
            id: 'rd3_inv_innovation_lab',
            name: "10. Innovation Lab & R&D Center",
            cost: 225000,
            description: "Establish dedicated innovation lab for future product development."
        },
        {
            id: 'rd3_inv_customer_experience',
            name: "11. Customer Experience Platform",
            cost: 150000,
            description: "Advanced customer experience and personalization platform."
        },
        {
            id: 'rd3_inv_acquisition',
            name: "12. Strategic Acquisition",
            cost: 350000,
            description: "Acquire complementary business or technology for rapid expansion."
        }
    ]
};