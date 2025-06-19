// src/core/content/InvestmentOptions.ts - SIMPLIFIED with Letter IDs

import {InvestmentOption} from '@shared/types/game';

export const allInvestmentOptionsData: Record<string, InvestmentOption[]> = {
    'rd1-invest': [
        {
            id: 'A',
            name: "Biz Growth Strategy",
            cost: 50000,
            description: "Invest in new market research and sales channels to increase orders and potentially ASP."
        },
        {
            id: 'B',
            name: "Production Efficiency",
            cost: 100000,
            description: "Upgrade tools and streamline assembly processes to boost capacity."
        },
        {
            id: 'C',
            name: "Add 2nd Shift",
            cost: 50000,
            description: "Hire and train staff for a second production shift, increasing capacity but also costs."
        },
        {
            id: 'D',
            name: "Supply Chain Optimization",
            cost: 75000,
            description: "Negotiate better supplier terms and improve logistics for cost savings and minor capacity gains."
        },
        {
            id: 'E',
            name: "Employee Development",
            cost: 50000,
            description: "Invest in training programs for current employees to improve efficiency and capacity."
        },
        {
            id: 'F',
            name: "Maximize Sales (Boutique)",
            cost: 100000,
            description: "Open a small boutique retail store to directly reach customers, increasing orders and ASP."
        },
    ],
    'rd2-invest': [
        {
            id: 'A',
            name: "Strategic Plan (KPI Card)",
            cost: 75000,
            description: "Develop a comprehensive strategic plan, potentially unlocking future KPI benefits."
        },
        {
            id: 'B',
            name: "Production Efficiency II",
            cost: 200000,
            description: "Further investments in production line optimization for significant capacity gains."
        },
        {
            id: 'C',
            name: "Add/Expand 2nd Shift",
            cost: 75000,
            description: "Increase staffing or hours for the second shift to boost capacity further."
        },
        {
            id: 'D',
            name: "Supply Chain Optimization II",
            cost: 150000,
            description: "Deeper supply chain integration for substantial cost reductions and better material flow."
        },
        {
            id: 'E',
            name: "Employee Development II",
            cost: 175000,
            description: "Advanced training and skill development programs for workforce productivity."
        },
        {
            id: 'F',
            name: "Maximize Boutique Sales & Distribution",
            cost: 225000,
            description: "Expand boutique operations and distribution network for higher sales and market reach."
        },
        {
            id: 'G',
            name: "Expand Distribution Channels - Big Box",
            cost: 125000,
            description: "Partner with big-box retailers to significantly increase order volume."
        },
        {
            id: 'H',
            name: "Enterprise Resource Planning/Business Software",
            cost: 100000,
            description: "Implement ERP system for better overall business management and efficiency."
        },
        {
            id: 'I',
            name: "IT Infrastructure and Cybersecurity",
            cost: 50000,
            description: "Upgrade IT systems and cybersecurity measures to protect operations and data."
        },
        {
            id: 'J',
            name: "Product Line Expansion - Inflatables",
            cost: 150000,
            description: "Diversify into the inflatable paddleboard market."
        },
        {
            id: 'K',
            name: "Technology Solutions - Automation and Cobots",
            cost: 150000,
            description: "Introduce automation and collaborative robots to the production line."
        },
        {
            id: 'L',
            name: "Market Share Attack",
            cost: 25000,
            description: "Aggressive marketing campaign to capture market share."
        }
    ],
    'rd3-invest': [
        {
            id: 'A',
            name: "Strategic Plan II - 5 Year Vision",
            cost: 100000,
            description: "Develop comprehensive 5-year strategic vision with implementation roadmap."
        },
        {
            id: 'B',
            name: "Production Efficiency III - Lean Manufacturing",
            cost: 250000,
            description: "Implement lean manufacturing principles and Six Sigma methodologies."
        },
        {
            id: 'C',
            name: "Add 3rd Shift - 24/7 Operations",
            cost: 125000,
            description: "Implement 24/7 operations with a third production shift."
        },
        {
            id: 'D',
            name: "Supply Chain III - Vertical Integration",
            cost: 200000,
            description: "Vertically integrate key supply chain components for better control."
        },
        {
            id: 'E',
            name: "Employee Development III - Leadership Program",
            cost: 150000,
            description: "Advanced leadership development and succession planning program."
        },
        {
            id: 'F',
            name: "Premium Brand Development",
            cost: 175000,
            description: "Develop premium brand positioning and luxury product line."
        },
        {
            id: 'G',
            name: "Global Market Expansion",
            cost: 300000,
            description: "Expand into international markets with localized strategies."
        },
        {
            id: 'H',
            name: "Digital Transformation Initiative",
            cost: 200000,
            description: "Comprehensive digital transformation including IoT and AI integration."
        },
        {
            id: 'I',
            name: "Sustainability & Green Manufacturing",
            cost: 175000,
            description: "Implement sustainable manufacturing practices and green technologies."
        },
        {
            id: 'J',
            name: "Innovation Lab & R&D Center",
            cost: 225000,
            description: "Establish dedicated innovation lab for future product development."
        },
        {
            id: 'K',
            name: "Customer Experience Platform",
            cost: 150000,
            description: "Advanced customer experience and personalization platform."
        },
        {
            id: 'L',
            name: "Strategic Acquisition",
            cost: 350000,
            description: "Acquire complementary business or technology for rapid expansion."
        }
    ]
};
