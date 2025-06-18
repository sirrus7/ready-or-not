// src/core/content/ConsequenceContent.ts
// PRODUCTION: Consequence definitions with explicit challenge tracking

import {Consequence} from '@shared/types/game';

export const allConsequencesData: Record<string, Consequence[]> = {
    'ch1-conseq': [ // Equipment Failure
        {
            id: 'ch1_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "The complex CNC machine takes longer than expected to arrive and integrate into your operations. You struggle for months to reach previous production levels, but you gain permanent future capabilities. Operations Managers, come to the facilitator desk to pick up a KPI Impact Card.",
            effects: [
                // Immediate effects
                {
                    kpi: 'capacity',
                    change_value: -250,
                    timing: 'immediate',
                    challenge_id: 'ch1',
                    option_id: 'A'
                },
                {
                    kpi: 'cost',
                    change_value: 50000,
                    timing: 'immediate',
                    challenge_id: 'ch1',
                    option_id: 'A'
                },
                // Permanent effect for future rounds
                {
                    kpi: 'capacity',
                    change_value: 500,
                    timing: 'permanent_next_round_start',
                    applies_to_rounds: [2, 3],
                    description: 'CNC Machine Bonus Capacity',
                    challenge_id: 'ch1',
                    option_id: 'A'
                }
            ]
        },
        {
            id: 'ch1_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Replacement equipment is easy to operate, but it took weeks for it to arrive; you've solved the problem and production is back on track, but you still lost some capacity and incurred costs.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: -250,
                    timing: 'immediate',
                    challenge_id: 'ch1',
                    option_id: 'B'
                },
                {
                    kpi: 'cost',
                    change_value: 50000,
                    timing: 'immediate',
                    challenge_id: 'ch1',
                    option_id: 'B'
                }
            ]
        },
        {
            id: 'ch1_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Outsourcing allowed you to quickly resume SUP production and repurpose employees & use the floor space to help crank out more boards.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: 250,
                    timing: 'immediate',
                    challenge_id: 'ch1',
                    option_id: 'C'
                },
                {
                    kpi: 'cost',
                    change_value: 25000,
                    timing: 'immediate',
                    challenge_id: 'ch1',
                    option_id: 'C'
                }
            ]
        },
        {
            id: 'ch1_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "Your hemming and hawing have caused significant delays. Channel partners are canceling orders and the production manager has started ordering expensive fins online.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: -500,
                    timing: 'immediate',
                    challenge_id: 'ch1',
                    option_id: 'D'
                },
                {
                    kpi: 'cost',
                    change_value: 75000,
                    timing: 'immediate',
                    challenge_id: 'ch1',
                    option_id: 'D'
                },
            ]
        },
    ],
    'ch2-conseq': [ // Revenue Tax
        {
            id: 'ch2_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Your ASP increase builds some additional profits. The fear that customers would balk at a $1,000-plus price proved to be a false narrative.",
            effects: [{
                kpi: 'asp',
                change_value: 20,
                timing: 'immediate',
                challenge_id: 'ch2',
                option_id: 'A'
            }]
        },
        {
            id: 'ch2_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Your marketing efforts pay off and increase Orders, helping to offset the new tax.",
            effects: [
                {
                    kpi: 'orders',
                    change_value: 500,
                    timing: 'immediate',
                    challenge_id: 'ch2',
                    option_id: 'B'
                },
                {
                    kpi: 'cost',
                    change_value: 25000,
                    timing: 'immediate',
                    challenge_id: 'ch2',
                    option_id: 'B'
                }
            ]
        },
        {
            id: 'ch2_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "You found some savings, but cost cutting didn't work as planned. It takes employees from their primary work. The result is unhappy employees and lower productivity.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: -250,
                    timing: 'immediate',
                    challenge_id: 'ch2',
                    option_id: 'C'
                },
                {
                    kpi: 'cost',
                    change_value: -25000,
                    timing: 'immediate',
                    challenge_id: 'ch2',
                    option_id: 'C'
                }
            ]
        },
        {
            id: 'ch2_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "The new tax will decrease your profits at the end of the round by increasing your costs.",
            effects: [{
                kpi: 'cost',
                change_value: 50000,
                timing: 'end_of_round_adjustment',
                description: 'New Tax Cost Incurred',
                challenge_id: 'ch2',
                option_id: 'D'
            }]
        },
    ],
    'ch3-conseq': [ // Recession
        {
            id: 'ch3_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "You successfully reduced your workforce and CAP. You've permanently impacted your KPIs for future rounds. HR Managers, come to the facilitator desk to pick up a KPI Adjustment Card.",
            effects: [
                {
                    kpi: 'orders',
                    change_value: -1000,
                    timing: 'immediate',
                    challenge_id: 'ch3',
                    option_id: 'A'
                },
                {
                    kpi: 'capacity',
                    change_value: -1000,
                    timing: 'immediate',
                    challenge_id: 'ch3',
                    option_id: 'A'
                },
                {
                    kpi: 'cost',
                    change_value: -250000,
                    timing: 'immediate',
                    challenge_id: 'ch3',
                    option_id: 'A'
                },
                {
                    kpi: 'capacity',
                    change_value: -1000,
                    timing: 'permanent_next_round_start',
                    applies_to_rounds: [2, 3],
                    description: "Layoff Penalty",
                    challenge_id: 'ch3',
                    option_id: 'A'
                }
            ]
        },
        {
            id: 'ch3_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "You successfully furloughed workers for the year to save costs and will get them back next year.",
            effects: [
                {
                    kpi: 'orders',
                    change_value: -750,
                    timing: 'immediate',
                    challenge_id: 'ch3',
                    option_id: 'B'
                },
                {
                    kpi: 'capacity',
                    change_value: -750,
                    timing: 'immediate',
                    challenge_id: 'ch3',
                    option_id: 'B'
                },
                {
                    kpi: 'cost',
                    change_value: -200000,
                    timing: 'immediate',
                    challenge_id: 'ch3',
                    option_id: 'B'
                }
            ]
        },
        {
            id: 'ch3_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "You cut overtime and temporary workers, providing some relief while maintaining core workforce.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: -500,
                    timing: 'immediate',
                    challenge_id: 'ch3',
                    option_id: 'C'
                },
                {
                    kpi: 'cost',
                    change_value: -100000,
                    timing: 'immediate',
                    challenge_id: 'ch3',
                    option_id: 'C'
                }
            ]
        },
        {
            id: 'ch3_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "You maintained the workforce but took a significant financial hit during the recession.",
            effects: [
                {
                    kpi: 'cost',
                    change_value: 100000,
                    timing: 'immediate',
                    challenge_id: 'ch3',
                    option_id: 'D'
                }
            ]
        }
    ],
    'ch4-conseq': [ // Supply Chain Crisis
        {
            id: 'ch4_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "You successfully diversified suppliers and reduced dependency on single sources.",
            effects: [
                {
                    kpi: 'cost',
                    change_value: 50000,
                    timing: 'immediate',
                    challenge_id: 'ch4',
                    option_id: 'A'
                },
                {
                    kpi: 'capacity',
                    change_value: 250,
                    timing: 'immediate',
                    challenge_id: 'ch4',
                    option_id: 'A'
                }
            ]
        },
        {
            id: 'ch4_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Emergency sourcing helped maintain production but at premium costs.",
            effects: [
                {
                    kpi: 'cost',
                    change_value: 100000,
                    timing: 'immediate',
                    challenge_id: 'ch4',
                    option_id: 'B'
                }
            ]
        },
        {
            id: 'ch4_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Inventory stockpiling protected against shortages but tied up capital.",
            effects: [
                {
                    kpi: 'cost',
                    change_value: 75000,
                    timing: 'immediate',
                    challenge_id: 'ch4',
                    option_id: 'C'
                }
            ]
        }
    ],
    'ch5-conseq': [ // Capacity Crisis
        {
            id: 'ch5_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Overtime and temporary workers increased capacity but at higher costs.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: 500,
                    timing: 'immediate',
                    challenge_id: 'ch5',
                    option_id: 'A'
                },
                {
                    kpi: 'cost',
                    change_value: 100000,
                    timing: 'immediate',
                    challenge_id: 'ch5',
                    option_id: 'A'
                }
            ]
        },
        {
            id: 'ch5_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Outsourcing production maintained delivery schedules with moderate cost increase.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: 750,
                    timing: 'immediate',
                    challenge_id: 'ch5',
                    option_id: 'B'
                },
                {
                    kpi: 'cost',
                    change_value: 75000,
                    timing: 'immediate',
                    challenge_id: 'ch5',
                    option_id: 'B'
                }
            ]
        },
        {
            id: 'ch5_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Process improvements increased efficiency but took time to implement.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: 300,
                    timing: 'immediate',
                    challenge_id: 'ch5',
                    option_id: 'C'
                },
                {
                    kpi: 'cost',
                    change_value: 50000,
                    timing: 'immediate',
                    challenge_id: 'ch5',
                    option_id: 'C'
                }
            ]
        },
        {
            id: 'ch5_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "Doing nothing resulted in missed orders and customer dissatisfaction.",
            effects: [
                {
                    kpi: 'orders',
                    change_value: -500,
                    timing: 'immediate',
                    challenge_id: 'ch5',
                    option_id: 'D'
                },
                {
                    kpi: 'capacity',
                    change_value: -250,
                    timing: 'immediate',
                    challenge_id: 'ch5',
                    option_id: 'D'
                }
            ]
        }
    ],
    'ch6-conseq': [ // Quality Crisis
        {
            id: 'ch6_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Immediate quality improvements restored customer confidence but increased costs.",
            effects: [
                {
                    kpi: 'cost',
                    change_value: 75000,
                    timing: 'immediate',
                    challenge_id: 'ch6',
                    option_id: 'A'
                },
                {
                    kpi: 'orders',
                    change_value: 250,
                    timing: 'immediate',
                    challenge_id: 'ch6',
                    option_id: 'A'
                }
            ]
        },
        {
            id: 'ch6_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Gradual quality improvements balanced cost and customer satisfaction.",
            effects: [
                {
                    kpi: 'cost',
                    change_value: 50000,
                    timing: 'immediate',
                    challenge_id: 'ch6',
                    option_id: 'B'
                }
            ]
        },
        {
            id: 'ch6_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Extensive quality overhaul significantly improved product but at high cost.",
            effects: [
                {
                    kpi: 'cost',
                    change_value: 125000,
                    timing: 'immediate',
                    challenge_id: 'ch6',
                    option_id: 'C'
                },
                {
                    kpi: 'orders',
                    change_value: 500,
                    timing: 'immediate',
                    challenge_id: 'ch6',
                    option_id: 'C'
                },
                {
                    kpi: 'asp',
                    change_value: 25,
                    timing: 'immediate',
                    challenge_id: 'ch6',
                    option_id: 'C'
                }
            ]
        },
        {
            id: 'ch6_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "Ignoring quality issues led to customer complaints and lost business.",
            effects: [
                {
                    kpi: 'orders',
                    change_value: -750,
                    timing: 'immediate',
                    challenge_id: 'ch6',
                    option_id: 'D'
                },
                {
                    kpi: 'asp',
                    change_value: -50,
                    timing: 'immediate',
                    challenge_id: 'ch6',
                    option_id: 'D'
                }
            ]
        }
    ],
    'ch7-conseq': [ // Competition Response
        {
            id: 'ch7_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Price matching maintained market share but reduced profitability.",
            effects: [
                {
                    kpi: 'asp',
                    change_value: -25,
                    timing: 'immediate',
                    challenge_id: 'ch7',
                    option_id: 'A'
                },
                {
                    kpi: 'orders',
                    change_value: 250,
                    timing: 'immediate',
                    challenge_id: 'ch7',
                    option_id: 'A'
                }
            ]
        },
        {
            id: 'ch7_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Innovation and differentiation justified premium pricing but required investment.",
            effects: [
                {
                    kpi: 'asp',
                    change_value: 50,
                    timing: 'immediate',
                    challenge_id: 'ch7',
                    option_id: 'B'
                },
                {
                    kpi: 'cost',
                    change_value: 100000,
                    timing: 'immediate',
                    challenge_id: 'ch7',
                    option_id: 'B'
                }
            ]
        },
        {
            id: 'ch7_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "More customization is a hit with consumers. You're able to maintain Orders and increase what you're charging. But customization adds Costs and slows down your production line.",
            effects: [
                {
                    kpi: 'asp',
                    change_value: 10,
                    timing: 'immediate',
                    challenge_id: 'ch7',
                    option_id: 'C'
                },
                {
                    kpi: 'capacity',
                    change_value: -500,
                    timing: 'immediate',
                    challenge_id: 'ch7',
                    option_id: 'C'
                },
                {
                    kpi: 'cost',
                    change_value: 25000,
                    timing: 'immediate',
                    challenge_id: 'ch7',
                    option_id: 'C'
                }
            ]
        },
        {
            id: 'ch7_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "You do nothing and take the hit from increased competition.",
            effects: [
                {
                    kpi: 'orders',
                    change_value: -250,
                    timing: 'immediate',
                    challenge_id: 'ch7',
                    option_id: 'D'
                },
                {
                    kpi: 'cost',
                    change_value: 25000,
                    timing: 'immediate',
                    challenge_id: 'ch7',
                    option_id: 'D'
                }
            ]
        }
    ],
    'ch8-conseq': [ // Cyber Attack
        {
            id: 'ch8_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "The hackers take your Bitcoin and unlock your IT system. The hackers release your customers' credit cards on the dark web, and don't attach Alu's name to the hack. You dodged a bullet. +1M SHAME",
            effects: [
                {
                    kpi: 'cost',
                    change_value: 100000,
                    timing: 'immediate',
                    challenge_id: 'ch8',
                    option_id: 'A'
                }
            ]
        },
        {
            id: 'ch8_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "The hackers take your Bitcoin and unlock your IT system. You had some disruptions. Customers are unhappy with your shoddy cyber security practices but appreciate your honesty.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: -250,
                    timing: 'immediate',
                    challenge_id: 'ch8',
                    option_id: 'B'
                },
                {
                    kpi: 'cost',
                    change_value: 300000,
                    timing: 'immediate',
                    challenge_id: 'ch8',
                    option_id: 'B'
                }
            ]
        },
        {
            id: 'ch8_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Rebuilding your IT infrastructure is slow and painful. The Hackers sell your customers' credit cards and blame ALU. Customers are furious. ORDERS take a hit.",
            effects: [
                {
                    kpi: 'orders',
                    change_value: -250,
                    timing: 'immediate',
                    challenge_id: 'ch8',
                    option_id: 'C'
                },
                {
                    kpi: 'cost',
                    change_value: 150000,
                    timing: 'immediate',
                    challenge_id: 'ch8',
                    option_id: 'C'
                }
            ]
        }
    ],
    'ch9-conseq': [ // ERP Crisis
        {
            id: 'ch9_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Rushing ERP implementation was stressful. In their haste, the consultant didn't source the best ERP system. You cut corners and missed important steps, impacting capacity.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: -1000,
                    timing: 'immediate',
                    challenge_id: 'ch9',
                    option_id: 'A'
                },
                {
                    kpi: 'cost',
                    change_value: 150000,
                    timing: 'immediate',
                    challenge_id: 'ch9',
                    option_id: 'A'
                }
            ]
        },
        {
            id: 'ch9_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "You scrambled to meet higher demand, but disconnected systems drove confusion and late orders. Hiring expediters was very expensive.",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: -1000,
                    timing: 'immediate',
                    challenge_id: 'ch9',
                    option_id: 'B'
                },
                {
                    kpi: 'cost',
                    change_value: 100000,
                    timing: 'immediate',
                    challenge_id: 'ch9',
                    option_id: 'B'
                }
            ]
        },
        {
            id: 'ch9_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Your foresight to invest in ERP has paid off. You avoid negative impacts and gain orders from competitors who failed to deliver.",
            effects: [
                {
                    kpi: 'orders',
                    change_value: 500,
                    timing: 'immediate',
                    challenge_id: 'ch9',
                    option_id: 'C'
                },
                {
                    kpi: 'cost',
                    change_value: -25000,
                    timing: 'immediate',
                    challenge_id: 'ch9',
                    option_id: 'C'
                }
            ]
        }
    ]
};
