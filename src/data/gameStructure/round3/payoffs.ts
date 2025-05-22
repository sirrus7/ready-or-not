// src/data/gameStructure/round3/payoffs.ts
import { InvestmentPayoff } from '../../../types';

export const round3InvestmentPayoffs: Record<string, InvestmentPayoff[]> = {
    'rd3-payoff': [
        {
            id: 'payoff_rd3_inv_strategic_plan_2',
            investment_option_id: 'rd3_inv_strategic_plan_2',
            name: "#1 Strategic Plan II",
            effects: [
                { kpi: 'capacity', change_value: 400, timing: 'immediate', description: "5-year vision implementation efficiency" },
                { kpi: 'cost', change_value: -75000, timing: 'immediate', description: "Strategic cost optimization" }
            ]
        },
        {
            id: 'payoff_rd3_inv_prod_efficiency_3',
            investment_option_id: 'rd3_inv_prod_efficiency_3',
            name: "#2 Lean Manufacturing",
            effects: [
                { kpi: 'capacity', change_value: 2500, timing: 'immediate', description: "Lean manufacturing capacity gains" },
                { kpi: 'cost', change_value: -150000, timing: 'immediate', description: "Lean efficiency cost savings" }
            ]
        },
        {
            id: 'payoff_rd3_inv_3rd_shift',
            investment_option_id: 'rd3_inv_3rd_shift',
            name: "#3 24/7 Operations",
            effects: [
                { kpi: 'capacity', change_value: 2200, timing: 'immediate', description: "24/7 operations capacity" },
                { kpi: 'cost', change_value: 500000, timing: 'immediate', description: "24/7 operations costs" }
            ]
        },
        {
            id: 'payoff_rd3_inv_supply_chain_3',
            investment_option_id: 'rd3_inv_supply_chain_3',
            name: "#4 Vertical Integration",
            effects: [
                { kpi: 'capacity', change_value: 600, timing: 'immediate', description: "Vertical integration efficiency" },
                { kpi: 'cost', change_value: -250000, timing: 'immediate', description: "Vertical integration cost control" }
            ]
        },
        {
            id: 'payoff_rd3_inv_emp_dev_3',
            investment_option_id: 'rd3_inv_emp_dev_3',
            name: "#5 Leadership Program",
            effects: [
                { kpi: 'capacity', change_value: 700, timing: 'immediate', description: "Leadership development productivity" },
                { kpi: 'cost', change_value: -100000, timing: 'immediate', description: "Leadership efficiency savings" }
            ]
        },
        {
            id: 'payoff_rd3_inv_premium_brand',
            investment_option_id: 'rd3_inv_premium_brand',
            name: "#6 Premium Brand",
            effects: [
                { kpi: 'orders', change_value: 600, timing: 'immediate', description: "Premium brand demand" },
                { kpi: 'asp', change_value: 75, timing: 'immediate', description: "Premium brand pricing" }
            ]
        },
        {
            id: 'payoff_rd3_inv_global_expansion',
            investment_option_id: 'rd3_inv_global_expansion',
            name: "#7 Global Expansion",
            effects: [
                { kpi: 'orders', change_value: 1500, timing: 'immediate', description: "Global market orders" },
                { kpi: 'cost', change_value: 200000, timing: 'immediate', description: "Global expansion costs" }
            ]
        },
        {
            id: 'payoff_rd3_inv_digital_transformation',
            investment_option_id: 'rd3_inv_digital_transformation',
            name: "#8 Digital Transformation",
            effects: [
                { kpi: 'capacity', change_value: 800, timing: 'immediate', description: "Digital efficiency gains" },
                { kpi: 'orders', change_value: 400, timing: 'immediate', description: "Digital customer engagement" },
                { kpi: 'cost', change_value: -125000, timing: 'immediate', description: "Digital automation savings" }
            ]
        },
        {
            id: 'payoff_rd3_inv_sustainability',
            investment_option_id: 'rd3_inv_sustainability',
            name: "#9 Sustainability & Green",
            effects: [
                { kpi: 'orders', change_value: 500, timing: 'immediate', description: "Eco-conscious customer demand" },
                { kpi: 'asp', change_value: 25, timing: 'immediate', description: "Sustainability premium" },
                { kpi: 'cost', change_value: -50000, timing: 'immediate', description: "Green efficiency savings" }
            ]
        },
        {
            id: 'payoff_rd3_inv_innovation_lab',
            investment_option_id: 'rd3_inv_innovation_lab',
            name: "#10 Innovation Lab",
            effects: [
                { kpi: 'orders', change_value: 800, timing: 'immediate', description: "Innovation-driven demand" },
                { kpi: 'asp', change_value: 50, timing: 'immediate', description: "Innovation premium pricing" }
            ]
        },
        {
            id: 'payoff_rd3_inv_customer_experience',
            investment_option_id: 'rd3_inv_customer_experience',
            name: "#11 Customer Experience",
            effects: [
                { kpi: 'orders', change_value: 700, timing: 'immediate', description: "Enhanced customer experience orders" },
                { kpi: 'asp', change_value: 35, timing: 'immediate', description: "Customer experience premium" }
            ]
        },
        {
            id: 'payoff_rd3_inv_acquisition',
            investment_option_id: 'rd3_inv_acquisition',
            name: "#12 Strategic Acquisition",
            effects: [
                { kpi: 'capacity', change_value: 1200, timing: 'immediate', description: "Acquired capacity" },
                { kpi: 'orders', change_value: 1000, timing: 'immediate', description: "Acquired customer base" },
                { kpi: 'asp', change_value: 20, timing: 'immediate', description: "Portfolio diversification premium" }
            ]
        }
    ],
    'dd-payoff': [
        {
            id: 'dd_payoff_critical_success',
            investment_option_id: 'any',
            name: "Double Down Critical Success",
            effects: [
                { kpi: 'capacity', change_value: 0, timing: 'immediate', description: "Double Down multiplier applied" },
                { kpi: 'orders', change_value: 0, timing: 'immediate', description: "Double Down multiplier applied" },
                { kpi: 'cost', change_value: 0, timing: 'immediate', description: "Double Down multiplier applied" },
                { kpi: 'asp', change_value: 0, timing: 'immediate', description: "Double Down multiplier applied" }
            ]
        },
        {
            id: 'dd_payoff_success',
            investment_option_id: 'any',
            name: "Double Down Success",
            effects: [
                { kpi: 'capacity', change_value: 0, timing: 'immediate', description: "Double Down multiplier applied" },
                { kpi: 'orders', change_value: 0, timing: 'immediate', description: "Double Down multiplier applied" },
                { kpi: 'cost', change_value: 0, timing: 'immediate', description: "Double Down multiplier applied" },
                { kpi: 'asp', change_value: 0, timing: 'immediate', description: "Double Down multiplier applied" }
            ]
        },
        {
            id: 'dd_payoff_failure',
            investment_option_id: 'any',
            name: "Double Down Failure",
            effects: [
                { kpi: 'capacity', change_value: 0, timing: 'immediate', description: "Double Down penalty applied" },
                { kpi: 'orders', change_value: 0, timing: 'immediate', description: "Double Down penalty applied" },
                { kpi: 'cost', change_value: 0, timing: 'immediate', description: "Double Down penalty applied" },
                { kpi: 'asp', change_value: 0, timing: 'immediate', description: "Double Down penalty applied" }
            ]
        }
    ]
};