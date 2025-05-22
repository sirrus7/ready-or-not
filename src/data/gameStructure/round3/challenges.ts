// src/data/gameStructure/round3/challenges.ts
import { ChallengeOption } from '../../../types';

export const round3ChallengeOptions: Record<string, ChallengeOption[]> = {
    'ch-dd-prompt': [
        {
            id: "yes_dd",
            text: "Yes, I want to Double Down!",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "Risk/Reward based on dice roll",
            is_default_choice: false
        },
        {
            id: "no_dd",
            text: "No, I'll stick with my current RD-3 investments.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "Keep all RD-3 investments as planned",
            is_default_choice: true
        }
    ],
    'ch8': [
        {
            id: "A",
            text: "Immediately shut down all systems and hire cybersecurity experts to assess damage.",
            estimated_cost: 200000,
            immediate_kpi_impact_preview: "-1000 Capacity, +$200k Costs",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Isolate critical systems and continue limited operations while investigating.",
            estimated_cost: 100000,
            immediate_kpi_impact_preview: "-500 Capacity, +$100k Costs",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Pay the ransom demand to quickly restore operations.",
            estimated_cost: 150000,
            immediate_kpi_impact_preview: "+$150k Costs, Risk of repeat attacks",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do nothing and hope the attack wasn't serious.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "Severe operational and data risks",
            is_default_choice: true
        }
    ],
    'ch9': [
        {
            id: "A",
            text: "Launch aggressive counter-offensive with new product features and pricing.",
            estimated_cost: 250000,
            immediate_kpi_impact_preview: "+750 Orders, +$250k Costs, +$30 ASP",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Focus on customer retention with loyalty programs and service improvements.",
            estimated_cost: 150000,
            immediate_kpi_impact_preview: "+400 Orders, +$150k Costs",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Pivot to niche markets where the competitor has less presence.",
            estimated_cost: 100000,
            immediate_kpi_impact_preview: "+200 Orders, +$100k Costs, +$20 ASP",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Continue current strategy and wait for market to stabilize.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "-1200 Orders, -$75 ASP",
            is_default_choice: true
        }
    ]
};