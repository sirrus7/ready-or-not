// src/data/gameStructure/round2/challenges.ts
import { ChallengeOption } from '../../../types';

export const round2ChallengeOptions: Record<string, ChallengeOption[]> = {
    'ch4': [
        {
            id: "A",
            text: "Find alternative suppliers quickly at higher cost to maintain production.",
            estimated_cost: 100000,
            immediate_kpi_impact_preview: "+$100k Costs, Maintain Production",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Negotiate with existing suppliers for partial delivery and adjust production schedule.",
            estimated_cost: 50000,
            immediate_kpi_impact_preview: "-500 Capacity, +$50k Costs",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Temporarily halt production and wait for supply chain to normalize.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "-1000 Capacity, -500 Orders",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do nothing and hope the disruption resolves quickly.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "Severe capacity and order impacts",
            is_default_choice: true
        }
    ],
    'ch5': [
        {
            id: "A",
            text: "Negotiate with union representatives and meet their demands.",
            estimated_cost: 200000,
            immediate_kpi_impact_preview: "+$200k Costs, Resolve Strike",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Hire temporary replacement workers during the strike.",
            estimated_cost: 150000,
            immediate_kpi_impact_preview: "-750 Capacity, +$150k Costs",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Close operations temporarily until strike is resolved.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "-1500 Capacity, -1000 Orders",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do nothing and let the strike continue.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "Extended production shutdown",
            is_default_choice: true
        }
    ],
    'ch6': [
        {
            id: "A",
            text: "Pivot quickly to meet new market demands with product modifications.",
            estimated_cost: 125000,
            immediate_kpi_impact_preview: "+500 Orders, +$125k Costs",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Increase marketing to maintain current market position.",
            estimated_cost: 75000,
            immediate_kpi_impact_preview: "+250 Orders, +$75k Costs",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Reduce prices to stay competitive in changing market.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "-$50 ASP, +300 Orders",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Maintain current strategy and hope market stabilizes.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "-750 Orders, Market share loss",
            is_default_choice: true
        }
    ],
    'ch7': [
        {
            id: "A",
            text: "Implement comprehensive compliance program immediately.",
            estimated_cost: 175000,
            immediate_kpi_impact_preview: "+$175k Costs, Full Compliance",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Implement minimal compliance to meet basic requirements.",
            estimated_cost: 100000,
            immediate_kpi_impact_preview: "+$100k Costs, -250 Capacity",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Challenge the regulation through legal channels while delaying compliance.",
            estimated_cost: 75000,
            immediate_kpi_impact_preview: "+$75k Legal Costs, Risk of Penalties",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Ignore the regulation and continue current operations.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "Risk of shutdown and heavy fines",
            is_default_choice: true
        }
    ]
};