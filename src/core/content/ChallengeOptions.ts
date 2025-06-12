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
            text: "Raise prices 2% to pass the entire tax thru to customers. This would raise ASP by $20, but also push average prices of ALU boards over $1,000.",
            estimated_cost: 0,
            is_default_choice: false
        },
        {
            id: "B",
            text: "Increase annual marketing budget by $25K to increase demand. If successful, this could result in 500 more Orders each year.",
            estimated_cost: 25000,
            is_default_choice: false
        },
        {
            id: "C",
            text: "Enact cost cutting measures like ending free coffee and snacks, etc. Estimated savings are $50,000.",
            estimated_cost: -50000,
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do Nothing. Maintain prices and current marketing budget and take the margin hit.",
            estimated_cost: 0,
            is_default_choice: true
        },
    ],
    'ch3': [
        {
            id: "A",
            text: "Lay-off 2 salaried, 4 hourly employees and cut overtime and temporary workers to reduce payroll costs. This should reduce COSTS by -$300K and CAP by 1250.",
            estimated_cost: -300000,
            is_default_choice: false
        },
        {
            id: "B",
            text: "Furlough/Workshare. Eliminate temp & overtime work, cut salaries by 10% & apply to the State Employment Dept’s Workshare Program. This should reduce COSTS by -$200K and CAP by -1000.",
            estimated_cost: -200000,
            is_default_choice: false
        },
        {
            id: "C",
            text: "Maintain current headcount but cut overtime and temp workers. This should reduce COSTS by -$100K and CAP by -500.",
            estimated_cost: -100000,
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do Nothing. The cash flow crisis will resolve itself but not without consequences.",
            estimated_cost: 0,
            is_default_choice: true
        },
    ],
    'ch4': [
        {
            id: "A",
            text: "Find more reliable international and domestic suppliers from companies with lower prices. This is expected to increase your materials cost by only 5-10% and avoid impacts to CAP.",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Attempt to renegotiate prices and payment terms with current suppliers, offering to continue buying from them at 10% higher prices in exchange for 45-day payment terms and smaller, more frequent deliveries.",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Stick to your current supply chain plan and ride out the short-term disruptions.",
            is_default_choice: true
        },
    ],
    'ch5': [
        {
            id: "A",
            text: "Hire a manager, 5 additional hourly employees, and increase overtime. Estimated impact: +$350k COST, +1,000 to +1,500 CAP.",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Hire Temporary Workers and increase overtime. Estimated impact: +$150K COST, +1,000 CAP.",
            is_default_choice: false
        },
        {
            id: "C",
            text: "BONUS OPTION: Take advantage of the supply-demand imbalance and increase prices. Can be combined with A or B. Estimated impact: +$50 ASP.",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do nothing.",
            is_default_choice: true
        }
    ],
    'ch6': [
        {
            id: "A",
            text: "Hire a Quality Control expert to build a system that increases in-process inspection, reduces defects and escapes. Put out messages on social media and your website to explain you've fixed the problem. Cost: $75K.",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Invest in active damage control. Engage a PR firm to launch a PR campaign, improve customer service, and repair damaged relationships over the next six months. Cost: $50K.",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Do options A & B. Cost: $125K.",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do Nothing.",
            is_default_choice: true
        }
    ],
    'ch7': [
        {
            id: "A",
            text: "Drop prices -$20 to be more competitive in the market.",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Increase your marketing and PR budget by $25K to maintain orders.",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Offer additional customization options with board colors and fin designs to be more competitive.",
            is_default_choice: false
        },
        {
            id: "D",
            text: "Do nothing.",
            is_default_choice: true
        }
    ],
    'ch8': [
        {
            id: "A",
            text: "Pay the hackers. Once hackers unlock your systems, invest in Cyber Security to prevent being hacked again. Don’t inform customers. Estimated cost: $100K",
            is_default_choice: false
        },
        {
            id: "B",
            text: "Pay the hackers. Once they unlock your systems, invest in Cyber Security to prevent being hacked again. Inform customers. Estimated cost: $100K",
            is_default_choice: false
        },
        {
            id: "C",
            text: "Don’t pay. Scrap your old system and buy new servers, computers and software with the latest Cyber Security protection. Inform your customers. Estimated cost: $75K",
            is_default_choice: true
        }
    ],
    'ch9': [
        {
            id: "A",
            text: "Attempt to rebuild your failing systems by contracting with an an ERP consultant to have them implement an ERP system and software as quickly as possible. Estimated COST is $150K",
            is_default_choice: false
        },
        {
            id: "B",
            text: "We don’t need no stinkin’ ERP. Count on your spreadsheets, firefighting expertise and expeditors to solve problems as they arise. Estimated Cost is $25,000 - $50,000",
            is_default_choice: true
        },
        {
            id: "C",
            text: "If you invested in Enterprise Resource Planning in RD-3, select this option",
            is_default_choice: false
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
    ]
};
