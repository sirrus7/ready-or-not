// src/data/gameStructure/round2/consequences.ts
import { Consequence } from '../../../types';

export const round2Consequences: Record<string, Consequence[]> = {
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
            narrative_text: "Maintaining current strategy resulted in significant market share loss as competitors adapted faster.",
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
            challenge_option_id: 'D',
            narrative_text: "Ignoring regulations resulted in immediate penalties and forced shutdown until compliance.",
            details: ["-2000 Current Capacity", "+$250k Current Costs", "-1000 Current Orders"],
            effects: [
                { kpi: 'capacity', change_value: -2000, timing: 'immediate', description: 'Regulatory shutdown' },
                { kpi: 'cost', change_value: 250000, timing: 'immediate', description: 'Regulatory fines and penalties' },
                { kpi: 'orders', change_value: -1000, timing: 'immediate', description: 'Lost orders during shutdown' }
            ]
        }
    ]
};