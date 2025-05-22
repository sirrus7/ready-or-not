// src/data/gameStructure/round1/payoffs.ts
import {InvestmentPayoff} from '../../../types';

export const round1InvestmentPayoffs: Record<string, InvestmentPayoff[]> = {
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
            name: "#3 Add 2nd Shift",
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
    ]
}