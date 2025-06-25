// src/core/content/InvestmentPayoffContent.ts - FULLY SIMPLIFIED: Letter IDs, no redundant fields

import {InvestmentPayoff} from '@shared/types/game';

export const allInvestmentPayoffsData: Record<string, InvestmentPayoff[]> = {
    'rd1-payoff': [
        {
            id: 'A',
            name: "Biz Growth Strategy",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: 250,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Business Growth Strategy'
                },
                {
                    kpi: 'orders',
                    change_value: 250,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Business Growth Strategy'
                },
                {
                    kpi: 'asp',
                    change_value: 20,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Business Growth Strategy'
                }
            ]
        },
        {
            id: 'B',
            name: "Production Efficiency",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: 1500,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Production Efficiency Investment'
                }
            ]
        },
        {
            id: 'C',
            name: "Add 2nd Shift",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: 1500,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Add 2nd Shift'
                },
                {
                    kpi: 'cost',
                    change_value: 300000,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Add 2nd Shift'
                }
            ]
        },
        {
            id: 'D',
            name: "Supply Chain Optimization",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: 250,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Supply Chain Optimization'
                },
                {
                    kpi: 'cost',
                    change_value: -100000,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Supply Chain Optimization'
                }
            ]
        },
        {
            id: 'E',
            name: "Employee Development",
            effects: [
                {
                    kpi: 'capacity',
                    change_value: 250,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Employee Development'
                },
                {
                    kpi: 'cost',
                    change_value: -25000,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Employee Development'
                }
            ]
        },
        {
            id: 'F',
            name: "Maximize Sales (Boutique)",
            effects: [
                {
                    kpi: 'orders',
                    change_value: 500,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Maximize Sales (Boutique)'
                },
                {
                    kpi: 'asp',
                    change_value: 20,
                    timing: 'immediate',
                    challenge_id: 'inv1',
                    description: 'Maximize Sales (Boutique)'
                }
            ]
        },
    ],
    'rd2-payoff': [
        {
            id: 'A',
            name: "Strategic Plan (KPI Card)",
            effects: [
                {kpi: 'capacity', change_value: 250, timing: 'immediate'},
                {kpi: 'orders', change_value: 250, timing: 'immediate'},
                {kpi: 'asp', change_value: 20, timing: 'immediate'}
            ]
        },
        {
            id: 'B',
            name: "Production Efficiency II",
            effects: [
                {kpi: 'capacity', change_value: 2500, timing: 'immediate'}
            ]
        },
        {
            id: 'C',
            name: "Add/Expand 2nd Shift",
            effects: [
                {kpi: 'capacity', change_value: 2000, timing: 'immediate'},
                {kpi: 'cost', change_value: 200000, timing: 'immediate'}
            ]
        },
        {
            id: 'D',
            name: "Supply Chain Optimization II",
            effects: [
                {kpi: 'capacity', change_value: 500, timing: 'immediate'},
                {kpi: 'cost', change_value: -250000, timing: 'immediate'}
            ]
        },
        {
            id: 'E',
            name: "Employee Development II",
            effects: [
                {kpi: 'capacity', change_value: 500, timing: 'immediate'},
                {kpi: 'cost', change_value: -50000, timing: 'immediate'}
            ]
        },
        {
            id: 'F',
            name: "Maximize Boutique Sales & Distribution",
            effects: [
                {kpi: 'orders', change_value: 750, timing: 'immediate'},
                {kpi: 'asp', change_value: 30, timing: 'immediate'}
            ]
        },
        {
            id: 'G',
            name: "Expand Distribution Channels - Big Box",
            effects: [
                {kpi: 'orders', change_value: 1500, timing: 'immediate'},
                {kpi: 'cost', change_value: 50000, timing: 'immediate'}
            ]
        },
        {
            id: 'H',
            name: "Enterprise Resource Planning/Business Software",
            effects: [
                {kpi: 'asp', change_value: 10, timing: 'immediate'},
                {kpi: 'orders', change_value: 250, timing: 'immediate'},
                {kpi: 'capacity', change_value: 250, timing: 'immediate'},
                {kpi: 'cost', change_value: 25000, timing: 'immediate'}
            ]
        },
        {
            id: 'I',
            name: "IT Infrastructure and Cybersecurity",
            effects: []
        },
        {
            id: 'J',
            name: "Product Line Expansion - Inflatables",
            effects: [
                {kpi: 'asp', change_value: -20, timing: 'immediate'},
                {kpi: 'orders', change_value: 1000, timing: 'immediate'},
                {kpi: 'capacity', change_value: 1000, timing: 'immediate'},
                {kpi: 'cost', change_value: 50000, timing: 'immediate'}
            ]
        },
        {
            id: 'K',
            name: "Technology Solutions - Automation and Cobots",
            effects: [
                {kpi: 'capacity', change_value: 1500, timing: 'immediate'},
                {kpi: 'cost', change_value: 150000, timing: 'immediate'}
            ]
        },
        {
            id: 'L',
            name: "Market Share Attack",
            effects: []
        },
    ],
    'rd3-payoff': [
        {
            id: 'A',
            name: "Strategic Plan II - 5 Year Vision",
            effects: [
                {kpi: 'capacity', change_value: 250, timing: 'immediate'},
                {kpi: 'orders', change_value: 250, timing: 'immediate'},
                {kpi: 'asp', change_value: 20, timing: 'immediate'}
            ]
        },
        {
            id: 'B',
            name: "Production Efficiency III - Lean Manufacturing",
            effects: [
                {kpi: 'capacity', change_value: 3000, timing: 'immediate'},
                {kpi: 'cost', change_value: 100000, timing: 'immediate'}
            ]
        },
        {
            id: 'C',
            name: "Add 3rd Shift - 24/7 Operations",
            effects: [
                {kpi: 'capacity', change_value: 4250, timing: 'immediate'},
                {kpi: 'cost', change_value: 750000, timing: 'immediate'}
            ]
        },
        {
            id: 'D',
            name: "Supply Chain III - Vertical Integration",
            effects: [
                {kpi: 'capacity', change_value: 750, timing: 'immediate'},
                {kpi: 'cost', change_value: -300000, timing: 'immediate'}
            ]
        },
        {
            id: 'E',
            name: "Employee Development III - Leadership Program",
            effects: [
                {kpi: 'capacity', change_value: 1500, timing: 'immediate'}
            ]
        },
        {
            id: 'F',
            name: "Maximize Boutique Sales III - Premium Market Dominance",
            effects: [
                {kpi: 'orders', change_value: 3000, timing: 'immediate'},
                {kpi: 'asp', change_value: 80, timing: 'immediate'}
            ]
        },
        {
            id: 'G',
            name: "Big Box Expansion III - Mass Market Penetration",
            effects: [
                {kpi: 'orders', change_value: 4000, timing: 'immediate'},
                {kpi: 'cost', change_value: 100000, timing: 'immediate'},
                {kpi: 'asp', change_value: -40, timing: 'immediate'}
            ]
        },
        {
            id: 'H',
            name: "Enterprise Resource Planning III - System Integration",
            effects: [
                {kpi: 'capacity', change_value: 250, timing: 'immediate'},
                {kpi: 'orders', change_value: 250, timing: 'immediate'},
                {kpi: 'cost', change_value: 25000, timing: 'immediate'},
                {kpi: 'asp', change_value: 10, timing: 'immediate'}
            ]
        },
        {
            id: 'I',
            name: "IT & Cyber Security III - Protected Infrastructure",
            effects: [
                // ✅ FIXED: No effects - slide shows "Protection from future cyber attacks" (immunity only)
            ]
        },
        {
            id: 'J',
            name: "Product Line Expansion III - Diversified Portfolio",
            effects: [
                {kpi: 'capacity', change_value: 4000, timing: 'immediate'},
                {kpi: 'orders', change_value: 4000, timing: 'immediate'},
                {kpi: 'cost', change_value: 200000, timing: 'immediate'},
                {kpi: 'asp', change_value: -80, timing: 'immediate'}
            ]
        },
        {
            id: 'K',
            name: "Automation & Co-Bots III - Full Automation",
            effects: [
                {kpi: 'capacity', change_value: 3750, timing: 'immediate'},
                {kpi: 'cost', change_value: 150000, timing: 'immediate'}
            ]
        }
    ]
};
