// src/core/content/ConsequenceContent.ts - Consolidated Consequence Definitions

import {Consequence} from '@shared/types/game';

export const allConsequencesData: Record<string, Consequence[]> = {
    'ch1-conseq': [ // Equipment Failure
        {
            id: 'ch1_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "The complex CNC machine takes longer than expected to arrive and integrate into your operations. You struggle for months to reach previous production levels, but you gain permanent future capabilities.",
            effects: [
                // Immediate effects (applied when consequence slide is shown)
                {kpi: 'capacity', change_value: -250, timing: 'immediate'},
                {kpi: 'cost', change_value: 50000, timing: 'immediate'},
                // Permanent effect for future rounds (CNC Machine bonus)
                {
                    kpi: 'capacity',
                    change_value: 500,
                    timing: 'permanent_next_round_start',
                    applies_to_rounds: [2, 3],
                    description: 'CNC Machine Bonus Capacity'
                }
            ]
        },
        {
            id: 'ch1_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Replacement equipment is easy to operate, but it took weeks for it to arrive; you've solved the problem and production is back on track, but you still lost some capacity and incurred costs.",
            effects: [
                {kpi: 'capacity', change_value: -250, timing: 'immediate'},
                {kpi: 'cost', change_value: 50000, timing: 'immediate'}
            ]
        },
        {
            id: 'ch1_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Outsourcing allowed you to quickly resume SUP production and repurpose employees & use the floor space to help crank out more boards.",
            effects: [
                {kpi: 'capacity', change_value: 250, timing: 'immediate'},
                {kpi: 'cost', change_value: 25000, timing: 'immediate'}
            ]
        },
        {
            id: 'ch1_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "Your hemming and hawing have caused significant delays. Channel partners are canceling orders and the production manager has started ordering expensive fins online.",
            effects: [
                {kpi: 'capacity', change_value: -500, timing: 'immediate'},
                {kpi: 'cost', change_value: 75000, timing: 'immediate'},
                {kpi: 'orders', change_value: -200, timing: 'immediate'}
            ]
        },
    ],
    'ch2-conseq': [ // Rev Tax
        {
            id: 'ch2_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Your ASP increase builds some additional profits. The fear that customers would balk at a $1,000-plus price proved to be a false narrative.",
            effects: [{kpi: 'asp', change_value: 10, timing: 'immediate'}]
        },
        {
            id: 'ch2_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Your marketing efforts pay off and increase Orders, helping to offset the new tax.",
            effects: [{kpi: 'orders', change_value: 500, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 25000,
                timing: 'immediate'
            }]
        },
        {
            id: 'ch2_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "You found some savings, but cost cutting didn't work as planned. It takes employees from their primary work. The result is unhappy employees and lower productivity.",
            effects: [{kpi: 'capacity', change_value: -250, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: -25000,
                timing: 'immediate'
            }]
        },
        {
            id: 'ch2_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "The new tax will decrease your profits at the end of the round by increasing your costs.",
            effects: [{kpi: 'cost', change_value: 50000, timing: 'immediate', description: 'New Tax Cost Incurred'}]
        },
    ],
    'ch3-conseq': [ // Recession
        {
            id: 'ch3_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "You successfully reduced your workforce and CAP. You've permanently impacted your KPIs for future rounds. HR Managers, come to the facilitator desk to pick up a KPI Adjustment Card.",
            effects: [
                {kpi: 'orders', change_value: -1000, timing: 'immediate'},
                {kpi: 'capacity', change_value: -1000, timing: 'immediate'},
                {kpi: 'cost', change_value: -250000, timing: 'immediate'},
                {
                    kpi: 'capacity',
                    change_value: -1000,
                    timing: 'permanent_next_round_start',
                    applies_to_rounds: [2, 3],
                    description: "Layoff Penalty"
                }
            ]
        },
        {
            id: 'ch3_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "You successfully furloughed workers for the year to save costs and will get them back next year.",
            effects: [
                {kpi: 'orders', change_value: -1000, timing: 'immediate'},
                {kpi: 'capacity', change_value: -1000, timing: 'immediate'},
                {kpi: 'cost', change_value: -200000, timing: 'immediate'}
            ]
        },
        {
            id: 'ch3_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "You maintained your current headcount and cut overtime and temp workers, providing some relief.",
            effects: [
                {kpi: 'orders', change_value: -1000, timing: 'immediate'},
                {kpi: 'capacity', change_value: -500, timing: 'immediate'},
                {kpi: 'cost', change_value: -100000, timing: 'immediate'}
            ]
        },
        {
            id: 'ch3_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "By not addressing the cashflow crisis, you’re not able to make payroll and have been late paying vendors. Some employees have quit and morale is low.",
            effects: [
                {kpi: 'orders', change_value: -1000, timing: 'immediate'},
                {kpi: 'capacity', change_value: -1000, timing: 'immediate'}
            ]
        },
    ],
    'ch4-conseq': [ // Supply Chain Crisis
        {
            id: 'ch4_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "New suppliers reduced the spike in materials costs, but are still more expensive. Small differences in materials are causing production problems. Quality and CAP are suffering.",
            effects: [{kpi: 'capacity', change_value: -250, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 50000,
                timing: 'immediate'
            }]
        },
        {
            id: 'ch4_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Your suppliers agree to renegotiate, appreciating your willingness to maintain the relationship. They prioritize your orders, but your costs still increase.",
            effects: [{kpi: 'cost', change_value: 50000, timing: 'immediate'}]
        },
        {
            id: 'ch4_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Sticking to your plan means your costs increase and delivery delays continue to disrupt manufacturing for the rest of the year.",
            effects: [{kpi: 'capacity', change_value: -500, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 75000,
                timing: 'immediate'
            }]
        }
    ],
    'ch5-conseq': [ // Capacity Crisis
        {
            id: 'ch5_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Hiring new employees is not easy in an economic boom. You pay higher recruiting and wage costs to secure the staff needed to increase capacity.",
            effects: [{kpi: 'orders', change_value: 1500, timing: 'immediate'}, {
                kpi: 'capacity',
                change_value: 1000,
                timing: 'immediate'
            }, {kpi: 'cost', change_value: 300000, timing: 'immediate'}]
        },
        {
            id: 'ch5_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Hiring temp workers is an effective short-term solution to raise capacity, but the booming economy forced you to pay higher wages and recruiting costs.",
            effects: [{kpi: 'orders', change_value: 1500, timing: 'immediate'}, {
                kpi: 'capacity',
                change_value: 1000,
                timing: 'immediate'
            }, {kpi: 'cost', change_value: 250000, timing: 'immediate'}]
        },
        {
            id: 'ch5_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "You take advantage of your product's reputation and increased customer interest, but lose some of your more value conscious customers.",
            effects: [{kpi: 'orders', change_value: 1250, timing: 'immediate'}, {
                kpi: 'asp',
                change_value: 50,
                timing: 'immediate'
            }]
        },
        {
            id: 'ch5_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "By doing nothing, you haven't impacted your KPIs, but you get the full boom in orders. Hopefully you have the capacity to meet the demand.",
            effects: [{kpi: 'orders', change_value: 1500, timing: 'immediate'}]
        }
    ],
    'ch6-conseq': [ // Quality Crisis
        {
            id: 'ch6_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "The QC expert slowly discovers the underlying cause, but bringing this expertise in during a crisis is costly, disruptive and time consuming. Your communications efforts are not well executed, costing you additional Orders and forcing discounting.",
            effects: [{kpi: 'orders', change_value: -250, timing: 'immediate'}, {
                kpi: 'capacity',
                change_value: -250,
                timing: 'immediate'
            }, {kpi: 'cost', change_value: 100000, timing: 'immediate'}]
        },
        {
            id: 'ch6_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Without a QC expert, you continue to build defective products. Your PR spend worked for a short period, but additional news of failing SUPs turned off many new customers, impacting Orders.",
            effects: [{kpi: 'orders', change_value: -500, timing: 'immediate'}, {
                kpi: 'capacity',
                change_value: -250,
                timing: 'immediate'
            }, {kpi: 'cost', change_value: 150000, timing: 'immediate'}]
        },
        {
            id: 'ch6_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "The QC expert sorted out the problem and the active PR managed the crisis effectively. While expensive, customers appreciated you going the extra mile, and you salvaged Orders and your brand reputation.",
            effects: [{kpi: 'orders', change_value: 250, timing: 'immediate'}, {
                kpi: 'capacity',
                change_value: -250,
                timing: 'immediate'
            }, {kpi: 'cost', change_value: 125000, timing: 'immediate'}]
        },
        {
            id: 'ch6_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "You do nothing and take the hit. Brand reputation is damaged.",
            effects: []
        }
    ],
    'ch7-conseq': [ // Competition
        {
            id: 'ch7_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Reducing ASP helped protect some of the at-risk orders, but not all, and it will negatively impact your margins.",
            effects: [{kpi: 'asp', change_value: -20, timing: 'immediate'}, {
                kpi: 'orders',
                change_value: -250,
                timing: 'immediate'
            }]
        },
        {
            id: 'ch7_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Your marketing and sales blitz helps maintain some orders, but your SUPs are still at a competitive disadvantage in retail stores.",
            effects: [{kpi: 'orders', change_value: -250, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 25000,
                timing: 'immediate'
            }]
        },
        {
            id: 'ch7_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "More customization is a hit with consumers. You’re able to maintain Orders and increase what you’re charging. But customization adds Costs and slows down your production line.",
            effects: [{kpi: 'asp', change_value: 10, timing: 'immediate'}, {
                kpi: 'capacity',
                change_value: -500,
                timing: 'immediate'
            }, {kpi: 'cost', change_value: 25000, timing: 'immediate'}]
        },
        {id: 'ch7_conseq_d', challenge_option_id: 'D', narrative_text: "You do nothing and take the hit.", effects: []}
    ],
    'ch8-conseq': [ // Cyber Attack
        {
            id: 'ch8_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "The hackers take your Bitcoin and unlock your IT system. The hackers release your customers’ credit cards on the dark web, and don’t attach Alu’s name to the hack. You dodged a bullet. +1M SHAME",
            effects: [{kpi: 'cost', change_value: 100000, timing: 'immediate'}]
        },
        {
            id: 'ch8_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "The hackers take your Bitcoin and unlock your IT system. You had some disruptions. Customers are unhappy with your shoddy cyber security practices but appreciate your honesty.",
            effects: [{kpi: 'capacity', change_value: -250, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 300000,
                timing: 'immediate'
            }]
        },
        {
            id: 'ch8_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Rebuilding your IT infrastructure is slow and painful. The Hackers sell your customers’ credit cards and blame ALU. Customers are furious. ORDERS take a hit.",
            effects: [{kpi: 'orders', change_value: -250, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 150000,
                timing: 'immediate'
            }]
        }
    ],
    'ch9-conseq': [ // ERP Crisis
        {
            id: 'ch9_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Rushing ERP implementation was stressful. In their haste, the consultant didn’t source the best ERP system. You cut corners and missed important steps, impacting capacity.",
            effects: [{kpi: 'capacity', change_value: -1000, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 150000,
                timing: 'immediate'
            }]
        },
        {
            id: 'ch9_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "You scrambled to meet higher demand, but disconnected systems drove confusion and late orders. Hiring expediters was very expensive.",
            effects: [{kpi: 'capacity', change_value: -1000, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: 100000,
                timing: 'immediate'
            }]
        },
        {
            id: 'ch9_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Your foresight to invest in ERP has paid off. You avoid negative impacts and gain orders from competitors who failed to deliver.",
            effects: [{kpi: 'orders', change_value: 500, timing: 'immediate'}, {
                kpi: 'cost',
                change_value: -25000,
                timing: 'immediate'
            }]
        }
    ]
};
