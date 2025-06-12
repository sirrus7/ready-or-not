// src/core/content/InvestmentPayoffContent.ts - Consolidated Investment Payoff Definitions

import {InvestmentPayoff} from '@shared/types/game';

export const allInvestmentPayoffsData: Record<string, InvestmentPayoff[]> = {
    'rd1-payoff': [
        {
            id: 'payoff_rd1_inv_biz_growth',
            investment_option_id: 'rd1_inv_biz_growth',
            name: "A. Biz Growth Strat.",
            effects: [{kpi: 'asp', change_value: 20, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 250,
                timing: 'immediate'
            }, {kpi: 'capacity', change_value: 250, timing: 'immediate'}]
        },
        {
            id: 'payoff_rd1_inv_prod_effic',
            investment_option_id: 'rd1_inv_prod_effic',
            name: "B. Prod. Efficiency",
            effects: [{kpi: 'capacity', change_value: 1000, timing: 'immediate'}]
        },
        {
            id: 'payoff_rd1_inv_2nd_shift',
            investment_option_id: 'rd1_inv_2nd_shift',
            name: "C. Add 2nd Shift",
            effects: [{kpi: 'capacity', change_value: 1500, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 300000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd1_inv_sup_chain',
            investment_option_id: 'rd1_inv_sup_chain',
            name: "D. Supply Chain Opt.",
            effects: [{kpi: 'capacity', change_value: 250, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: -100000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd1_inv_emp_dev',
            investment_option_id: 'rd1_inv_emp_dev',
            name: "E. Employee Dev.",
            effects: [{kpi: 'capacity', change_value: 250, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: -25000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd1_inv_boutique',
            investment_option_id: 'rd1_inv_boutique',
            name: "F. Maximize Sales (Boutique)",
            effects: [{kpi: 'asp', change_value: 20, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 500,
                timing: 'immediate'
            }]
        },
    ],
    'rd2-payoff': [
        {
            id: 'payoff_rd2_inv_prod_efficiency_2',
            investment_option_id: 'rd2_inv_prod_efficiency_2',
            name: "B. Production Efficiency II",
            effects: [{kpi: 'capacity', change_value: 2000, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 50000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd2_inv_add_exp_2nd_shift',
            investment_option_id: 'rd2_inv_add_exp_2nd_shift',
            name: "C. Add/Expand 2nd Shift",
            effects: [{kpi: 'capacity', change_value: 3000, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 575000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd2_inv_supply_chain_opt_2',
            investment_option_id: 'rd2_inv_supply_chain_opt_2',
            name: "D. Supply Chain Optimization II",
            effects: [{kpi: 'capacity', change_value: 500, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: -200000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd2_inv_emp_dev_2',
            investment_option_id: 'rd2_inv_emp_dev_2',
            name: "E. Employee Development II",
            effects: [{kpi: 'capacity', change_value: 500, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: -25000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd2_inv_maximize_boutique',
            investment_option_id: 'rd2_inv_maximize_boutique',
            name: "F. Maximize Boutique Sales & Distro",
            effects: [{kpi: 'asp', change_value: 40, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 2000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd2_inv_expand_dist_channels',
            investment_option_id: 'rd2_inv_expand_dist_channels',
            name: "G. Expand Distribution Channels - Big Box",
            effects: [{kpi: 'asp', change_value: -20, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 1500,
                timing: 'immediate'
            }, {kpi: 'cost', change_value: 50000, timing: 'immediate'}]
        },
        {
            id: 'payoff_rd2_inv_erp',
            investment_option_id: 'rd2_inv_erp',
            name: "H. Enterprise Resource Planning/Business Software",
            effects: [{kpi: 'asp', change_value: 10, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 250,
                timing: 'immediate'
            }, {kpi: 'capacity', change_value: 250, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 25000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd2_inv_it_cybersecurity',
            investment_option_id: 'rd2_inv_it_cybersecurity',
            name: "I. IT Infrastructure and Cybersecurity",
            effects: []
        },
        {
            id: 'payoff_rd2_inv_prod_line_expansion',
            investment_option_id: 'rd2_inv_prod_line_expansion',
            name: "J. Product Line Expansion - Inflatables",
            effects: [{kpi: 'asp', change_value: -20, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 1000,
                timing: 'immediate'
            }, {kpi: 'capacity', change_value: 1000, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 50000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd2_inv_automation_cobots',
            investment_option_id: 'rd2_inv_automation_cobots',
            name: "K. Technology Solutions - Automation and Cobots",
            effects: [{kpi: 'capacity', change_value: 1500, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 150000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd2_inv_market_share_attack',
            investment_option_id: 'rd2_inv_market_share_attack',
            name: "L. Market Share Attack",
            effects: []
        },
    ],
    'rd3-payoff': [
        {
            id: 'payoff_rd3_inv_strategic_plan_2',
            investment_option_id: 'rd3_inv_strategic_plan_2',
            name: "A. Strategic Plan II - 5 Year Vision",
            effects: [{kpi: 'asp', change_value: 20, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 250,
                timing: 'immediate'
            }, {kpi: 'capacity', change_value: 250, timing: 'immediate'}]
        },
        {
            id: 'payoff_rd3_inv_prod_efficiency_3',
            investment_option_id: 'rd3_inv_prod_efficiency_3',
            name: "B. Production Efficiency III - Lean Manufacturing",
            effects: [{kpi: 'capacity', change_value: 3000, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 100000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd3_inv_3rd_shift',
            investment_option_id: 'rd3_inv_3rd_shift',
            name: "C. Add 3rd Shift - 24/7 Operations",
            effects: [{kpi: 'capacity', change_value: 4250, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 750000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd3_inv_supply_chain_3',
            investment_option_id: 'rd3_inv_supply_chain_3',
            name: "D. Supply Chain III - Vertical Integration",
            effects: [{kpi: 'capacity', change_value: 750, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: -300000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd3_inv_emp_dev_3',
            investment_option_id: 'rd3_inv_emp_dev_3',
            name: "E. Employee Development III - Leadership Program",
            effects: [{kpi: 'capacity', change_value: 1500, timing: 'immediate'}]
        },
        {
            id: 'payoff_rd3_inv_premium_brand',
            investment_option_id: 'rd3_inv_premium_brand',
            name: "F. Premium Brand Development",
            effects: [{kpi: 'asp', change_value: 80, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 3000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd3_inv_global_expansion',
            investment_option_id: 'rd3_inv_global_expansion',
            name: "G. Global Market Expansion",
            effects: [{kpi: 'asp', change_value: -40, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 4000,
                timing: 'immediate'
            }, {kpi: 'cost', change_value: 100000, timing: 'immediate'}]
        },
        {
            id: 'payoff_rd3_inv_digital_transformation',
            investment_option_id: 'rd3_inv_digital_transformation',
            name: "H. Digital Transformation Initiative",
            effects: [{kpi: 'asp', change_value: 10, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 250,
                timing: 'immediate'
            }, {kpi: 'capacity', change_value: 250, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 25000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd3_inv_sustainability',
            investment_option_id: 'rd3_inv_sustainability',
            name: "I. Sustainability & Green Manufacturing",
            effects: []
        },
        {
            id: 'payoff_rd3_inv_innovation_lab',
            investment_option_id: 'rd3_inv_innovation_lab',
            name: "J. Innovation Lab & R&D Center",
            effects: [{kpi: 'asp', change_value: -80, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: 4000,
                timing: 'immediate'
            }, {kpi: 'capacity', change_value: 4000, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 200000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd3_inv_customer_experience',
            investment_option_id: 'rd3_inv_customer_experience',
            name: "K. Customer Experience Platform",
            effects: [{kpi: 'capacity', change_value: 3750, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 150000,
                timing: 'immediate'
            }]
        },
        {
            id: 'payoff_rd3_inv_acquisition',
            investment_option_id: 'rd3_inv_acquisition',
            name: "L. Strategic Acquisition",
            effects: []
        }
    ],
    'dd-payoff': [
        {
            id: 'dd_payoff_critical_success',
            investment_option_id: 'any',
            name: "Double Down Critical Success",
            effects: []
        },
        {id: 'dd_payoff_success', investment_option_id: 'any', name: "Double Down Success", effects: []},
        {id: 'dd_payoff_failure', investment_option_id: 'any', name: "Double Down Failure", effects: []}
    ]
};
