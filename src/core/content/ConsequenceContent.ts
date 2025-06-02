// src/core/content/ConsequenceContent.ts - Consolidated Consequence Definitions

import { Consequence } from '@shared/types/game';

export const allConsequencesData: Record<string, Consequence[]> = {
    // --- Inlined from src/data/gameStructure/round1/consequences.ts ---
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
            id: 'ch3_conseq_d',
            challenge_option_id: 'D', // Corrected this key
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
    ],
    // --- Inlined from src/data/gameStructure/round2/consequences.ts ---
    'ch4-conseq': [
        {
            id: 'ch4_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Your quick action to find alternative suppliers maintained production levels, though at a higher cost.",
            details: ["+$100k Current Costs", "Production maintained"],
            effects: [
                { kpi: 'cost', change_value: 100000, timing: 'immediate', description: 'Alternative supplier premium' }
            ]
        },
        {
            id: 'ch4_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Negotiating with suppliers provided partial relief, but production capacity was still reduced.",
            details: ["-500 Current Capacity", "+$50k Current Costs"],
            effects: [
                { kpi: 'capacity', change_value: -500, timing: 'immediate', description: 'Partial supply disruption' },
                { kpi: 'cost', change_value: 50000, timing: 'immediate', description: 'Supplier negotiation costs' }
            ]
        },
        {
            id: 'ch4_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Halting production avoided additional costs but significantly impacted capacity and orders.",
            details: ["-1000 Current Capacity", "-500 Current Orders"],
            effects: [
                { kpi: 'capacity', change_value: -1000, timing: 'immediate', description: 'Production halt' },
                { kpi: 'orders', change_value: -500, timing: 'immediate', description: 'Lost orders due to halt' }
            ]
        },
        {
            id: 'ch4_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "Doing nothing resulted in severe supply chain disruptions affecting all aspects of production.",
            details: ["-1500 Current Capacity", "-1000 Current Orders", "+$75k Current Costs"],
            effects: [
                { kpi: 'capacity', change_value: -1500, timing: 'immediate', description: 'Severe supply disruption' },
                { kpi: 'orders', change_value: -1000, timing: 'immediate', description: 'Lost orders from disruption' },
                { kpi: 'cost', change_value: 75000, timing: 'immediate', description: 'Emergency procurement costs' }
            ]
        }
    ],
    'ch5-conseq': [
        {
            id: 'ch5_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Meeting union demands resolved the strike quickly, maintaining production but increasing costs.",
            details: ["+$200k Current Costs", "Strike resolved, production maintained"],
            effects: [
                { kpi: 'cost', change_value: 200000, timing: 'immediate', description: 'Union settlement costs' }
            ]
        },
        {
            id: 'ch5_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Temporary workers partially maintained production, though at reduced efficiency and higher costs.",
            details: ["-750 Current Capacity", "+$150k Current Costs"],
            effects: [
                { kpi: 'capacity', change_value: -750, timing: 'immediate', description: 'Reduced efficiency with temp workers' },
                { kpi: 'cost', change_value: 150000, timing: 'immediate', description: 'Temporary worker premium' }
            ]
        },
        {
            id: 'ch5_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Closing operations avoided additional costs but severely impacted production and customer orders.",
            details: ["-1500 Current Capacity", "-1000 Current Orders"],
            effects: [
                { kpi: 'capacity', change_value: -1500, timing: 'immediate', description: 'Complete production shutdown' },
                { kpi: 'orders', change_value: -1000, timing: 'immediate', description: 'Lost orders during closure' }
            ]
        },
        {
            id: 'ch5_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "Letting the strike continue resulted in extended shutdown and permanent loss of some customers.",
            details: ["-2000 Current Capacity", "-1500 Current Orders", "+$50k Current Costs"],
            effects: [
                { kpi: 'capacity', change_value: -2000, timing: 'immediate', description: 'Extended strike impact' },
                { kpi: 'orders', change_value: -1500, timing: 'immediate', description: 'Permanent customer loss' },
                { kpi: 'cost', change_value: 50000, timing: 'immediate', description: 'Strike-related damages' }
            ]
        }
    ],
    'ch6-conseq': [
        {
            id: 'ch6_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Your quick pivot to meet market demands paid off with increased orders, though at development costs.",
            details: ["+500 Current Orders", "+$125k Current Costs"],
            effects: [
                { kpi: 'orders', change_value: 500, timing: 'immediate', description: 'Market pivot success' },
                { kpi: 'cost', change_value: 125000, timing: 'immediate', description: 'Product modification costs' }
            ]
        },
        {
            id: 'ch6_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Increased marketing helped maintain some market position with moderate gains.",
            details: ["+250 Current Orders", "+$75k Current Costs"],
            effects: [
                { kpi: 'orders', change_value: 250, timing: 'immediate', description: 'Marketing boost' },
                { kpi: 'cost', change_value: 75000, timing: 'immediate', description: 'Additional marketing spend' }
            ]
        },
        {
            id: 'ch6_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Reducing prices helped maintain competitiveness and gained some orders, but reduced profit margins.",
            details: ["-$50 Current ASP", "+300 Current Orders"],
            effects: [
                { kpi: 'asp', change_value: -50, timing: 'immediate', description: 'Competitive price reduction' },
                { kpi: 'orders', change_value: 300, timing: 'immediate', description: 'Price-driven demand increase' }
            ]
        },
        {
            id: 'ch6_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "Maintaining current strategy while competitors innovated resulted in significant market share and pricing power loss.",
            details: ["-750 Current Orders", "Market share erosion"],
            effects: [
                { kpi: 'orders', change_value: -750, timing: 'immediate', description: 'Market share loss' }
            ]
        }
    ],
    'ch7-conseq': [
        {
            id: 'ch7_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Full compliance implementation ensured smooth operations and avoided any regulatory penalties.",
            details: ["+$175k Current Costs", "Full regulatory compliance achieved"],
            effects: [
                { kpi: 'cost', change_value: 175000, timing: 'immediate', description: 'Comprehensive compliance costs' }
            ]
        },
        {
            id: 'ch7_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Minimal compliance met basic requirements but resulted in some operational inefficiencies.",
            details: ["+$100k Current Costs", "-250 Current Capacity"],
            effects: [
                { kpi: 'cost', change_value: 100000, timing: 'immediate', description: 'Basic compliance costs' },
                { kpi: 'capacity', change_value: -250, timing: 'immediate', description: 'Compliance-related inefficiencies' }
            ]
        },
        {
            id: 'ch7_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Legal challenges bought time but created uncertainty and ongoing legal expenses.",
            details: ["+$75k Current Costs", "Regulatory uncertainty continues"],
            effects: [
                { kpi: 'cost', change_value: 75000, timing: 'immediate', description: 'Legal challenge costs' }
            ]
        },
        {
            id: 'ch7_conseq_d',
            challenge_option_id: 'D', // Corrected this key
            narrative_text: "Ignoring regulations resulted in immediate penalties and forced shutdown until compliance.",
            details: ["-2000 Current Capacity", "+$250k Current Costs", "-1000 Current Orders"],
            effects: [
                { kpi: 'capacity', change_value: -2000, timing: 'immediate', description: 'Regulatory shutdown' },
                { kpi: 'cost', change_value: 250000, timing: 'immediate', description: 'Regulatory fines and penalties' },
                { kpi: 'orders', change_value: -1000, timing: 'immediate', description: 'Lost orders during shutdown' }
            ]
        }
    ],
    // --- Inlined from src/data/gameStructure/round3/consequences.ts ---
    'ch8-conseq': [
        {
            id: 'ch8_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Your immediate shutdown and expert response contained the damage effectively, though at significant cost and operational impact.",
            details: ["-1000 Current Capacity", "+$200k Current Costs", "Systems secured"],
            effects: [
                { kpi: 'capacity', change_value: -1000, timing: 'immediate', description: 'System shutdown impact' },
                { kpi: 'cost', change_value: 200000, timing: 'immediate', description: 'Cybersecurity expert costs' }
            ]
        },
        {
            id: 'ch8_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Isolating critical systems allowed some operations to continue while you investigated the breach.",
            details: ["-500 Current Capacity", "+$100k Current Costs", "Partial operations maintained"],
            effects: [
                { kpi: 'capacity', change_value: -500, timing: 'immediate', description: 'Limited operations during investigation' },
                { kpi: 'cost', change_value: 100000, timing: 'immediate', description: 'Investigation and isolation costs' }
            ]
        },
        {
            id: 'ch8_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Paying the ransom restored operations quickly, but you're now a known target for future attacks.",
            details: ["+$150k Current Costs", "Operations restored", "Future vulnerability"],
            effects: [
                { kpi: 'cost', change_value: 150000, timing: 'immediate', description: 'Ransom payment' },
                {
                    kpi: 'cost',
                    change_value: 50000,
                    timing: 'permanent_next_round_start',
                    applies_to_rounds: [3],
                    description: 'Ongoing security vulnerability costs'
                }
            ]
        },
        {
            id: 'ch8_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "Ignoring the attack resulted in massive data theft, system corruption, and complete operational shutdown.",
            details: ["-2500 Current Capacity", "+$300k Current Costs", "-1500 Current Orders"],
            effects: [
                { kpi: 'capacity', change_value: -2500, timing: 'immediate', description: 'Complete system failure' },
                { kpi: 'cost', change_value: 300000, timing: 'immediate', description: 'Emergency recovery and legal costs' },
                { kpi: 'orders', change_value: -1500, timing: 'immediate', description: 'Lost customer trust and orders' }
            ]
        }
    ],
    'ch9-conseq': [
        {
            id: 'ch9_conseq_a',
            challenge_option_id: 'A',
            narrative_text: "Your aggressive counter-offensive successfully differentiated your products and won back market share at premium pricing.",
            details: ["+750 Current Orders", "+$250k Current Costs", "+$30 Current ASP"],
            effects: [
                { kpi: 'orders', change_value: 750, timing: 'immediate', description: 'Successful market counter-offensive' },
                { kpi: 'cost', change_value: 250000, timing: 'immediate', description: 'Product development and marketing costs' },
                { kpi: 'asp', change_value: 30, timing: 'immediate', description: 'Premium pricing success' }
            ]
        },
        {
            id: 'ch9_conseq_b',
            challenge_option_id: 'B',
            narrative_text: "Customer retention programs helped maintain loyalty and prevented further customer loss.",
            details: ["+400 Current Orders", "+$150k Current Costs"],
            effects: [
                { kpi: 'orders', change_value: 400, timing: 'immediate', description: 'Customer retention success' },
                { kpi: 'cost', change_value: 150000, timing: 'immediate', description: 'Loyalty program and service costs' }
            ]
        },
        {
            id: 'ch9_conseq_c',
            challenge_option_id: 'C',
            narrative_text: "Pivoting to niche markets provided a safe haven with premium pricing, though at smaller scale.",
            details: ["+200 Current Orders", "+$100k Current Costs", "+$20 Current ASP"],
            effects: [
                { kpi: 'orders', change_value: 200, timing: 'immediate', description: 'Niche market success' },
                { kpi: 'cost', change_value: 100000, timing: 'immediate', description: 'Market pivot costs' },
                { kpi: 'asp', change_value: 20, timing: 'immediate', description: 'Niche premium pricing' }
            ]
        },
        {
            id: 'ch9_conseq_d',
            challenge_option_id: 'D',
            narrative_text: "Maintaining current strategy while competitors innovated resulted in significant market share and pricing power loss.",
            details: ["-1200 Current Orders", "-$75 Current ASP"],
            effects: [
                { kpi: 'orders', change_value: -1200, timing: 'immediate', description: 'Market share loss to competitors' },
                { kpi: 'asp', change_value: -75, timing: 'immediate', description: 'Pricing power erosion' }
            ]
        }
    ]
};