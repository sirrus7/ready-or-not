// src/data/gameStructure/round1/consequences.ts
import {Consequence} from '../../../types';

export const round1Consequences: Record<string, Consequence[]> = {
    'ch1-conseq': [
        {
            id: 'ch1_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "The complex CNC machine takes longer than expected to arrive and integrate into your operations. You struggle for months to reach previous production levels.",
            details: ["Initial: -250 CAP, +$50K COSTS.", "Future: Receive Permanent KPI Card: +500 Capacity (RD-2 & RD-3)."],
            effects: [
                {kpi: 'capacity', change_value: -250, timing: 'immediate', description: 'CNC setup delay'},
                {kpi: 'cost', change_value: 50000, timing: 'immediate', description: 'CNC setup cost'},
                {
                    kpi: 'capacity',
                    change_value: 500,
                    timing: 'permanent_next_round_start',
                    applies_to_rounds: [2, 3],
                    description: 'CNC Machine Bonus Capacity'
                }
            ],
            impact_card_image_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FKPI_Impact_Cards%2FPerm_KPI_Card_CNC.jpg?alt=media'
        },
        {
            id: 'ch1_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Replacement equipment is easy to operate, but it took weeks for it to arrive; you've solved the problem and production is back on track, but you still lost some CAP and incurred costs.",
            details: ["-250 CAP (initial problem)", "+$25K COST (option cost)"],
            effects: [
                {
                    kpi: 'capacity',
                    change_value: -250,
                    timing: 'immediate',
                    description: 'Equip. Fail Event (unavoidable)'
                },
                {kpi: 'cost', change_value: 25000, timing: 'immediate', description: 'Replacement Die Cast Cost'}
            ]
        },
        {
            id: 'ch1_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Outsourcing allowed you to quickly resume SUP production and repurpose employees & use the floor space to help crank out more boards.",
            details: ["+250 CAP (net gain after initial problem)", "+$25K COST (option cost)"],
            effects: [
                {
                    kpi: 'capacity',
                    change_value: -250,
                    timing: 'immediate',
                    description: 'Equip. Fail Event (unavoidable)'
                },
                {
                    kpi: 'capacity',
                    change_value: 500,
                    timing: 'immediate',
                    description: 'Outsourcing & Repurposing Benefit'
                },
                {kpi: 'cost', change_value: 25000, timing: 'immediate', description: 'Outsourcing Setup Cost'}
            ]
        },
        {
            id: 'ch1_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "Your hemming and hawing have caused significant delays. Channel partners are canceling orders and the production manager has started ordering expensive fins online.",
            details: ["-500 CAP (total from equip fail & delay)", "+$75K COST", "-200 Orders"],
            effects: [
                {kpi: 'capacity', change_value: -500, timing: 'immediate', description: 'Equip. Fail & Delay'},
                {kpi: 'cost', change_value: 75000, timing: 'immediate', description: 'Increased repair/rush costs'},
                {kpi: 'orders', change_value: -200, timing: 'immediate', description: 'Cancelled orders'}
            ]
        },
    ],
    'ch2-conseq': [
        {
            id: 'ch2_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Your ASP increase builds some additional profits. The fear that customers would balk at $1,000-plus price proved to be a false narrative.",
            details: ["+$20 ASP", "-250 Orders"],
            effects: [
                {kpi: 'asp', change_value: 20, timing: 'immediate', description: 'Price Increase'},
                {
                    kpi: 'orders',
                    change_value: -250,
                    timing: 'immediate',
                    description: 'Slight demand drop from price increase'
                }
            ]
        },
        {
            id: 'ch2_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Your marketing efforts pay off and increase Orders.",
            details: ["+500 Orders", "+$25K COSTS"],
            effects: [
                {kpi: 'orders', change_value: 500, timing: 'immediate', description: 'Marketing Boost'},
                {kpi: 'cost', change_value: 25000, timing: 'immediate', description: 'Increased Marketing Spend'}
            ]
        },
        {
            id: 'ch2_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "You found some savings, but cost cutting didn't work as planned. It takes employees from their primary work. The result is unhappy employees and lower productivity.",
            details: ["-250 CAP", "-$25K COSTS (Savings)"],
            effects: [
                {kpi: 'capacity', change_value: -250, timing: 'immediate', description: 'Productivity dip from cuts'},
                {kpi: 'cost', change_value: -25000, timing: 'immediate', description: 'Cost Cutting Savings'}
            ]
        },
        {
            id: 'ch2_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "The new tax will decrease your profits at the end of the round by increasing your costs.",
            details: ["+$50K COSTS (New Tax)"],
            effects: [{kpi: 'cost', change_value: 50000, timing: 'immediate', description: 'New Tax Cost Incurred'}]
        },
    ],
    'ch3-conseq': [
        {
            id: 'ch3_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "You successfully reduced your workforce and CAP in the future. You've permanently impacted your KPIs. HR Managers, come to the facilitator desk to pick up a KPI Adjustment Card.",
            details: ["-1250 Current CAP", "-$300K Current Costs", "Permanent KPI Card: -1000 Capacity (Future - from spreadsheet)"],
            effects: [
                {kpi: 'cost', change_value: -300000, timing: 'immediate', description: "Layoff Savings"},
                {
                    kpi: 'capacity',
                    change_value: -1250,
                    timing: 'immediate',
                    description: "Immediate Capacity Reduction from Layoffs"
                },
                {
                    kpi: 'capacity',
                    change_value: -1000,
                    timing: 'permanent_next_round_start',
                    applies_to_rounds: [2, 3],
                    description: "Permanent Capacity Reduction from Layoffs"
                }
            ],
            impact_card_image_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FKPI_Impact_Cards%2FPerm_KPI_Card_Layoff.jpg?alt=media"
        },
        {
            id: 'ch3_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "You successfully furloughed workers for the year to save costs and will get them back next year.",
            details: ["-1000 Current CAP", "-$200K Current Costs"],
            effects: [
                {kpi: 'cost', change_value: -200000, timing: 'immediate', description: "Furlough Savings"},
                {
                    kpi: 'capacity',
                    change_value: -1000,
                    timing: 'immediate',
                    description: "Capacity Reduction from Furlough"
                }
            ]
        },
        {
            id: 'ch3_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "You maintained your current headcount and cut overtime and temp workers.",
            details: ["-500 Current CAP", "-$100K Current Costs"],
            effects: [
                {kpi: 'cost', change_value: -100000, timing: 'immediate', description: "OT/Temp Cuts Savings"},
                {
                    kpi: 'capacity',
                    change_value: -500,
                    timing: 'immediate',
                    description: "Capacity Reduction from OT/Temp Cuts"
                }
            ]
        },
        {
            id: 'ch3_conseq_d', challenge_option_id: 'D',
            narrative_text: "By not addressing the cashflow crisis, you’re not able to make payroll and have been late paying vendors. Some employees have quit. Morale is low. Both reduce capacity. In addition, legal and admin costs erase any cost savings you realized from the employees who quit.",
            details: ["-1000 Current CAP (from quits/morale)", "+$25K Current Costs (net from admin fees)"],
            effects: [
                {
                    kpi: 'capacity',
                    change_value: -1000,
                    timing: 'immediate',
                    description: "Recession - Quits and low morale"
                },
                {
                    kpi: 'cost',
                    change_value: 25000,
                    timing: 'immediate',
                    description: "Recession - Admin/Legal fees, no net savings"
                }
            ]
        },
    ]
};