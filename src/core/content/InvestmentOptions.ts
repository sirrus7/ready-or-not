// src/core/content/InvestmentOptions.ts - Consolidated Investment Options

import {InvestmentOption} from '@shared/types/game';

export const allInvestmentOptionsData: Record<string, InvestmentOption[]> = {
    // --- Inlined from src/data/gameStructure/round1/investments.ts ---
    'rd1-invest': [
        {
            id: 'rd1_inv_biz_growth',
            name: "A. Biz Growth Strat.",
            cost: 50000,
            description: "Invest in new market research and sales channels to increase orders and potentially ASP."
        },
        {
            id: 'rd1_inv_prod_effic',
            name: "B. Prod. Efficiency",
            cost: 100000,
            description: "Upgrade tools and streamline assembly processes to boost capacity."
        },
        {
            id: 'rd1_inv_2nd_shift',
            name: "C. Add 2nd Shift",
            cost: 50000,
            description: "Hire and train staff for a second production shift, increasing capacity but also costs."
        },
        {
            id: 'rd1_inv_sup_chain',
            name: "D. Supply Chain Opt.",
            cost: 75000,
            description: "Negotiate better supplier terms and improve logistics for cost savings and minor capacity gains."
        },
        {
            id: 'rd1_inv_emp_dev',
            name: "E. Employee Dev.",
            cost: 50000,
            description: "Invest in training programs for current employees to improve efficiency and capacity."
        },
        {
            id: 'rd1_inv_boutique',
            name: "F. Maximize Sales (Boutique)",
            cost: 100000,
            description: "Open a small boutique retail store to directly reach customers, increasing orders and ASP."
        },
    ],

    // --- Inlined from src/data/gameStructure/round2/investments.ts ---
    'rd2-invest': [
        {
            id: 'rd2_inv_strategic_plan',
            name: "A. Strategic Plan (KPI Card)",
            cost: 75000,
            description: "Develop a comprehensive strategic plan, potentially unlocking future KPI benefits."
        },
        {
            id: 'rd2_inv_prod_efficiency_2',
            name: "B. Production Efficiency II",
            cost: 200000,
            description: "Further investments in production line optimization for significant capacity gains."
        },
        {
            id: 'rd2_inv_add_exp_2nd_shift',
            name: "C. Add/Expand 2nd Shift",
            cost: 75000,
            description: "Increase staffing or hours for the second shift to boost capacity further."
        },
        {
            id: 'rd2_inv_supply_chain_opt_2',
            name: "D. Supply Chain Optimization II",
            cost: 150000,
            description: "Deeper supply chain integration for substantial cost reductions and better material flow."
        },
        {
            id: 'rd2_inv_emp_dev_2',
            name: "E. Employee Development II",
            cost: 175000,
            description: "Advanced training and skill development programs for workforce productivity."
        },
        {
            id: 'rd2_inv_maximize_boutique',
            name: "F. Maximize Boutique Sales & Distro",
            cost: 225000,
            description: "Expand boutique operations and distribution network for higher sales and market reach."
        },
        {
            id: 'rd2_inv_expand_dist_channels',
            name: "G. Expand Distribution Channels - Big Box",
            cost: 125000,
            description: "Partner with big-box retailers to significantly increase order volume."
        },
        {
            id: 'rd2_inv_erp',
            name: "H. Enterprise Resource Planning/Business Software",
            cost: 100000,
            description: "Implement ERP system for better overall business management and efficiency."
        },
        {
            id: 'rd2_inv_it_cybersecurity',
            name: "I. IT Infrastructure and Cybersecurity",
            cost: 50000,
            description: "Upgrade IT systems and cybersecurity measures to protect operations and data."
        },
        {
            id: 'rd2_inv_prod_line_expansion',
            name: "J. Product Line Expansion - Inflatables",
            cost: 150000,
            description: "Diversify into the inflatable paddleboard market."
        },
        {
            id: 'rd2_inv_automation_cobots',
            name: "K. Technology Solutions - Automation and Cobots",
            cost: 150000,
            description: "Introduce automation and collaborative robots to the production line."
        },
        {
            id: 'rd2_inv_market_share_attack',
            name: "L. Market Share Attack",
            cost: 25000,
            description: "Aggressive marketing campaign to capture market share."
        }
    ],

    // --- Inlined from src/data/gameStructure/round3/investments.ts ---
    'rd3-invest': [
        {
            id: 'rd3_inv_strategic_plan_2',
            name: "A. Strategic Plan II - 5 Year Vision",
            cost: 100000,
            description: "Develop comprehensive 5-year strategic vision with implementation roadmap."
        },
        {
            id: 'rd3_inv_prod_efficiency_3',
            name: "B. Production Efficiency III - Lean Manufacturing",
            cost: 250000,
            description: "Implement lean manufacturing principles and Six Sigma methodologies."
        },
        {
            id: 'rd3_inv_3rd_shift',
            name: "C. Add 3rd Shift - 24/7 Operations",
            cost: 125000,
            description: "Implement 24/7 operations with a third production shift."
        },
        {
            id: 'rd3_inv_supply_chain_3',
            name: "D. Supply Chain III - Vertical Integration",
            cost: 200000,
            description: "Vertically integrate key supply chain components for better control."
        },
        {
            id: 'rd3_inv_emp_dev_3',
            name: "E. Employee Development III - Leadership Program",
            cost: 150000,
            description: "Advanced leadership development and succession planning program."
        },
        {
            id: 'rd3_inv_premium_brand',
            name: "F. Premium Brand Development",
            cost: 175000,
            description: "Develop premium brand positioning and luxury product line."
        },
        {
            id: 'rd3_inv_global_expansion',
            name: "G. Global Market Expansion",
            cost: 300000,
            description: "Expand into international markets with localized strategies."
        },
        {
            id: 'rd3_inv_digital_transformation',
            name: "H. Digital Transformation Initiative",
            cost: 200000,
            description: "Comprehensive digital transformation including IoT and AI integration."
        },
        {
            id: 'rd3_inv_sustainability',
            name: "I. Sustainability & Green Manufacturing",
            cost: 175000,
            description: "Implement sustainable manufacturing practices and green technologies."
        },
        {
            id: 'rd3_inv_innovation_lab',
            name: "J. Innovation Lab & R&D Center",
            cost: 225000,
            description: "Establish dedicated innovation lab for future product development."
        },
        {
            id: 'rd3_inv_customer_experience',
            name: "K. Customer Experience Platform",
            cost: 150000,
            description: "Advanced customer experience and personalization platform."
        },
        {
            id: 'rd3_inv_acquisition',
            name: "L. Strategic Acquisition",
            cost: 350000,
            description: "Acquire complementary business or technology for rapid expansion."
        }
    ]
};
