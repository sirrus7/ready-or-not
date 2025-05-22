// src/data/gameStructure/round2/payoffs.ts
import { InvestmentPayoff } from '../../../types';

export const round2InvestmentPayoffs: Record<string, InvestmentPayoff[]> = {
    'rd2-payoff': [
        {
            id: 'payoff_rd2_inv_strategic_plan',
            investment_option_id: 'rd2_inv_strategic_plan',
            name: "#1 Strategic Plan",
            effects: [
                { kpi: 'capacity', change_value: 300, timing: 'immediate', description: "Strategic planning efficiency boost" },
                {
                    kpi: 'cost',
                    change_value: -50000,
                    timing: 'permanent_next_round_start',
                    applies_to_rounds: [3],
                    description: "Strategic cost management benefits"
                }
            ]
        },
        {
            id: 'payoff_rd2_inv_prod_efficiency_2',
            investment_option_id: 'rd2_inv_prod_efficiency_2',
            name: "#2 Production Efficiency II",
            effects: [
                { kpi: 'capacity', change_value: 2000, timing: 'immediate', description: "Advanced production efficiency gains" }
            ]
        },
        {
            id: 'payoff_rd2_inv_add_exp_2nd_shift',
            investment_option_id: 'rd2_inv_add_exp_2nd_shift',
            name: "#3 Add/Expand 2nd Shift",
            effects: [
                { kpi: 'capacity', change_value: 1800, timing: 'immediate', description: "Expanded 2nd shift capacity" },
                { kpi: 'cost', change_value: 400000, timing: 'immediate', description: "Expanded 2nd shift operating costs" }
            ]
        },
        {
            id: 'payoff_rd2_inv_supply_chain_opt_2',
            investment_option_id: 'rd2_inv_supply_chain_opt_2',
            name: "#4 Supply Chain Optimization II",
            effects: [
                { kpi: 'capacity', change_value: 400, timing: 'immediate', description: "Advanced supply chain capacity boost" },
                { kpi: 'cost', change_value: -200000, timing: 'immediate', description: "Advanced supply chain cost savings" }
            ]
        },
        {
            id: 'payoff_rd2_inv_emp_dev_2',
            investment_option_id: 'rd2_inv_emp_dev_2',
            name: "#5 Employee Development II",
            effects: [
                { kpi: 'capacity', change_value: 500, timing: 'immediate', description: "Advanced employee development capacity boost" },
                { kpi: 'cost', change_value: -75000, timing: 'immediate', description: "Employee efficiency cost savings" }
            ]
        },
        {
            id: 'payoff_rd2_inv_maximize_boutique',
            investment_option_id: 'rd2_inv_maximize_boutique',
            name: "#6 Maximize Boutique Sales & Distro",
            effects: [
                { kpi: 'orders', change_value: 800, timing: 'immediate', description: "Expanded boutique order increase" },
                { kpi: 'asp', change_value: 40, timing: 'immediate', description: "Premium boutique ASP increase" }
            ]
        },
        {
            id: 'payoff_rd2_inv_expand_dist_channels',
            investment_option_id: 'rd2_inv_expand_dist_channels',
            name: "#7 Expand Distribution Channels",
            effects: [
                { kpi: 'orders', change_value: 1200, timing: 'immediate', description: "Big box retail order boost" },
                { kpi: 'asp', change_value: -15, timing: 'immediate', description: "Big box pricing pressure" }
            ]
        },
        {
            id: 'payoff_rd2_inv_erp',
            investment_option_id: 'rd2_inv_erp',
            name: "#8 Enterprise Resource Planning",
            effects: [
                { kpi: 'capacity', change_value: 250, timing: 'immediate', description: "ERP operational efficiency" },
                { kpi: 'cost', change_value: -100000, timing: 'immediate', description: "ERP cost optimization" }
            ]
        },
        {
            id: 'payoff_rd2_inv_it_cybersecurity',
            investment_option_id: 'rd2_inv_it_cybersecurity',
            name: "#9 IT Infrastructure and Cybersecurity",
            effects: [
                { kpi: 'capacity', change_value: 150, timing: 'immediate', description: "IT efficiency improvements" },
                {
                    kpi: 'capacity',
                    change_value: 200,
                    timing: 'permanent_next_round_start',
                    applies_to_rounds: [3],
                    description: "Cybersecurity protection bonus"
                }
            ]
        },
        {
            id: 'payoff_rd2_inv_prod_line_expansion',
            investment_option_id: 'rd2_inv_prod_line_expansion',
            name: "#10 Product Line Expansion - Inflatables",
            effects: [
                { kpi: 'orders', change_value: 600, timing: 'immediate', description: "New product line orders" },
                { kpi: 'capacity', change_value: 300, timing: 'immediate', description: "Diversified production capacity" }
            ]
        },
        {
            id: 'payoff_rd2_inv_automation_cobots',
            investment_option_id: 'rd2_inv_automation_cobots',
            name: "#11 Automation and Cobots",
            effects: [
                { kpi: 'capacity', change_value: 1000, timing: 'immediate', description: "Automation capacity boost" },
                { kpi: 'cost', change_value: -150000, timing: 'immediate', description: "Automation labor cost savings" }
            ]
        },
        {
            id: 'payoff_rd2_inv_market_share_attack',
            investment_option_id: 'rd2_inv_market_share_attack',
            name: "#12 Market Share Attack",
            effects: [
                { kpi: 'orders', change_value: 400, timing: 'immediate', description: "Aggressive marketing order boost" },
                { kpi: 'asp', change_value: 10, timing: 'immediate', description: "Brand strength ASP increase" }
            ]
        }
    ]
};