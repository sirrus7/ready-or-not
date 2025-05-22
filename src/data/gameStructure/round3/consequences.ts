// src/data/gameStructure/round3/consequences.ts
import { Consequence } from '../../../types';

export const round3Consequences: Record<string, Consequence[]> = {
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