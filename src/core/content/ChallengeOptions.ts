// src/core/content/ChallengeOptions.ts - Consolidated Challenge Options

import {ChallengeOption} from '@shared/types/game';

export const allChallengeOptionsData: Record<string, ChallengeOption[]> = {
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
    ],
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