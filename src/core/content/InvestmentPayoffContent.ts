// src/core/content/InvestmentPayoffContent.ts - Consolidated Investment Payoff Definitions

import { InvestmentPayoff } from '@shared/types/common.ts';

export const allInvestmentPayoffsData: Record<string, InvestmentPayoff[]> = {
    // --- Inlined from src/data/gameStructure/round1/payoffs.ts ---
    'rd1-payoff': [
        {
            id: 'payoff_rd1_inv_biz_growth',
            investment_option_id: 'rd1_inv_biz_growth',
            name: "#1 Biz Growth Strat.",
            effects: [
                {kpi: 'capacity', change_value: 250, timing: 'immediate', description: "Biz Growth Capacity Boost"},
                {kpi: 'orders', change_value: 250, timing: 'immediate', description: "Biz Growth Order Increase"},
                {kpi: 'asp', change_value: 20, timing: 'immediate', description: "Biz Growth ASP Increase"}
            ]
        },
        {
            id: 'payoff_rd1_inv_prod_effic',
            investment_option_id: 'rd1_inv_prod_effic',
            name: "#2 Prod. Efficiency",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: 1500,
                    timing: 'immediate',
                    description: "Prod Efficiency Capacity Boost"
                }
            ]
        },
        {
            id: 'payoff_rd1_inv_2nd_shift',
            investment_option_id: 'rd1_inv_2nd_shift',
            name: "3. Add 2nd Shift",
            effects: [
                {kpi: 'capacity', change_value: 1500, timing: 'immediate', description: "2nd Shift Capacity"},
                {kpi: 'cost', change_value: 300000, timing: 'immediate', description: "2nd Shift Operating Costs"}
            ]
        },
        {
            id: 'payoff_rd1_inv_sup_chain',
            investment_option_id: 'rd1_inv_sup_chain',
            name: "#4 Supply Chain Opt.",
            effects: [
                {kpi: 'capacity', change_value: 250, timing: 'immediate', description: "Supply Chain Capacity Boost"},
                {kpi: 'cost', change_value: -100000, timing: 'immediate', description: "Supply Chain Cost Savings"}
            ]
        },
        {
            id: 'payoff_rd1_inv_emp_dev', investment_option_id: 'rd1_inv_emp_dev', name: "#5 Employee Dev.", effects: [
                {kpi: 'capacity', change_value: 250, timing: 'immediate', description: "Emp Dev Capacity Boost"},
                {kpi: 'cost', change_value: -25000, timing: 'immediate', description: "Emp Dev Cost Savings"}
            ]
        },
        {
            id: 'payoff_rd1_inv_boutique',
            investment_option_id: 'rd1_inv_boutique',
            name: "#6 Maximize Sales (Boutique)",
            effects: [
                {kpi: 'orders', change_value: 500, timing: 'immediate', description: "Boutique Order Increase"},
                {kpi: 'asp', change_value: 20, timing: 'immediate', description: "Boutique ASP Increase"}
            ]
        },
    ],

    // --- Inlined from src/data/gameStructure/round2/payoffs.ts (Corrected) ---
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
            name: "3. Add/Expand 2nd Shift",
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
    ],

    // --- Inlined from src/data/gameStructure/round3/payoffs.ts ---
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
            name: "3. 24/7 Operations",
            effects: [
                { kpi: 'capacity', change_value: 2200, timing: 'immediate', description: "24/7 operations capacity" },
                { kpi: 'cost', change_value: 500000, timing: 'immediate', description: "24/7 operations costs" }
            ]
        },
        {
            id: 'payoff_rd3_inv_supply_chain_3',
            investment_option_id: 'rd3_inv_supply_chain_3',
            name: "4. Vertical Integration",
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