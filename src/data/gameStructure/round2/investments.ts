// src/data/gameStructure/round2/investments.ts
import { InvestmentOption } from '../../../types';

export const round2InvestmentOptions: Record<string, InvestmentOption[]> = {
    'rd2-invest': [
        {
            id: 'rd2_inv_strategic_plan',
            name: "1. Strategic Plan (KPI Card)",
            cost: 75000,
            description: "Develop a comprehensive strategic plan, potentially unlocking future KPI benefits."
        },
        {
            id: 'rd2_inv_prod_efficiency_2',
            name: "2. Production Efficiency II",
            cost: 200000,
            description: "Further investments in production line optimization for significant capacity gains."
        },
        {
            id: 'rd2_inv_add_exp_2nd_shift',
            name: "3. Add/Expand 2nd Shift",
            cost: 75000,
            description: "Increase staffing or hours for the second shift to boost capacity further."
        },
        {
            id: 'rd2_inv_supply_chain_opt_2',
            name: "4. Supply Chain Optimization II",
            cost: 150000,
            description: "Deeper supply chain integration for substantial cost reductions and better material flow."
        },
        {
            id: 'rd2_inv_emp_dev_2',
            name: "5. Employee Development II",
            cost: 175000,
            description: "Advanced training and skill development programs for workforce productivity."
        },
        {
            id: 'rd2_inv_maximize_boutique',
            name: "6. Maximize Boutique Sales & Distro",
            cost: 225000,
            description: "Expand boutique operations and distribution network for higher sales and market reach."
        },
        {
            id: 'rd2_inv_expand_dist_channels',
            name: "7. Expand Distribution Channels - Big Box",
            cost: 125000,
            description: "Partner with big-box retailers to significantly increase order volume."
        },
        {
            id: 'rd2_inv_erp',
            name: "8. Enterprise Resource Planning/Business Software",
            cost: 100000,
            description: "Implement ERP system for better overall business management and efficiency."
        },
        {
            id: 'rd2_inv_it_cybersecurity',
            name: "9. IT Infrastructure and Cybersecurity",
            cost: 50000,
            description: "Upgrade IT systems and cybersecurity measures to protect operations and data."
        },
        {
            id: 'rd2_inv_prod_line_expansion',
            name: "10. Product Line Expansion - Inflatables",
            cost: 150000,
            description: "Diversify into the inflatable paddleboard market."
        },
        {
            id: 'rd2_inv_automation_cobots',
            name: "11. Technology Solutions - Automation and Cobots",
            cost: 150000,
            description: "Introduce automation and collaborative robots to the production line."
        },
        {
            id: 'rd2_inv_market_share_attack',
            name: "12. Market Share Attack",
            cost: 25000,
            description: "Aggressive marketing campaign to capture market share."
        }
    ]
};