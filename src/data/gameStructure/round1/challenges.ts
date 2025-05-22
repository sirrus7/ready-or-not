// src/data/gameStructure/round1/challenges.ts
import { ChallengeOption } from '../../../types';

export const round1ChallengeOptions: Record<string, ChallengeOption[]> = {
    'ch1': [
        {
            id: "A",
            text: "Purchase an automated CNC Machine for making fins. It's more complex than casting, but could make lighter, stronger, more customizable fins and increase your CAP. Estimated COST is $50K.",
            estimated_cost: 50000,
            is_default_choice: false
        },
        {
            id: "B",
            text: "Purchase replacement die casting equipment. Your employees already know how to operate it so it's unlikely to disrupt operations. Estimated COST is $25K.",
            estimated_cost: 25000,
            is_default_choice: false
        },
        {
            id: "C",
            text: "Outsource aluminum fin manufacturing to a local machine shop. This opens the door to customized CNC Machined Fins and CAP flexibility, but reduces direct control over this part of your manufacturing. Estimated COST is $25K.",
            estimated_cost: 25000,
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do nothing. Attempt to repair existing equipment as failures occur.",
            estimated_cost: 0,
            is_default_choice: true
        },
    ],
    'ch2': [
        {
            id: "A",
            text: "Raise prices 2% to pass the entire tax thru to customers. This would raise ASP by $20 (from $1000 to $1020).",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "+$20 ASP, -250 Orders",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Increase annual marketing budget by $25K to increase demand. If successful, this could result in 500 more Orders each year.",
            estimated_cost: 25000,
            immediate_kpi_impact_preview: "+500 Orders, +$25k Costs",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Enact cost cutting measures like ending free coffee and snacks, etc. Estimated savings are $25,000.",
            estimated_cost: -25000,
            immediate_kpi_impact_preview: "-$25k Costs, -250 Capacity",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do Nothing. Maintain prices and current marketing budget and absorb the tax.",
            estimated_cost: 0,
            immediate_kpi_impact_preview: "+$50k Costs (Tax)",
            is_default_choice: true
        },
    ],
    'ch3': [
        {
            id: "A",
            text: "Lay-off 2 salaried, 4 hourly. Reduce CAP by 1250, Costs by $300K.",
            estimated_cost: -300000,
            immediate_kpi_impact_preview: "-1250 CAP, -$300k Costs",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Furlough/Workshare. Reduce CAP by 1000, Costs by $200K.",
            estimated_cost: -200000,
            immediate_kpi_impact_preview: "-1000 CAP, -$200k Costs",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Maintain headcount, cut OT/Temps. Reduce CAP by 500, Costs by $100K.",
            estimated_cost: -100000,
            immediate_kpi_impact_preview: "-500 CAP, -$100k Costs",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do Nothing. Lose 1000 Orders and 1000 Capacity. Costs increase $25k.",
            estimated_cost: 25000,
            immediate_kpi_impact_preview: "-1000 Orders, -1000 CAP, +$25k Costs",
            is_default_choice: true
        },
    ],
};