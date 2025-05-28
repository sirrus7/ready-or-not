// src/data/gameStructure/round3/slides.ts
import { Slide } from '../../../types';

export const round3Slides: Slide[] = [
    // Round 3 Introduction and Investment
    {
        id: 200,
        title: "Round 3 Introduction Video",
        type: 'video',
        source_url: "placeholder_rd3_intro.mp4",
        auto_advance_after_video: false,
        host_alert: {
            title: "Begin RD-3 Investments",
            message: "Teams will now make RD-3 Investments. The timer video will begin."
        }
    },
    {
        id: 201,
        title: "RD-3 Investment Decision Period",
        type: 'interactive_invest',
        source_url: "placeholder_rd3_invest_timer_video.mp4",
        interactive_data_key: 'rd3-invest',
        main_text: "RD-3 INVEST: TIMER ACTIVE",
        sub_text: "Video timer active. Make your RD-3 investment decisions.",
        auto_advance_after_video: false,
        host_alert: {
            title: "RD-3 Investments Closed",
            message: "RD-3 investments are closed. Prepare for Double Down. Click OK."
        }
    },

    // Double Down Opportunity
    {
        id: 202,
        title: "Double Down Opportunity Decision",
        type: 'interactive_double_down_prompt',
        interactive_data_key: 'ch-dd-prompt',
        main_text: "DOUBLE DOWN OPPORTUNITY!",
        sub_text: "Decide if your team wants to take the Double Down risk/reward. Timer on screen.",
        timer_duration_seconds: 3 * 60,
        background_css: 'bg-red-700',
        host_alert: {
            title: "Double Down Decision Closed",
            message: "Teams have made their Double Down choice. Click OK for selection or to skip to CH8."
        }
    },
    {
        id: 203,
        title: "Select Double Down Investments",
        type: 'interactive_double_down_select',
        interactive_data_key: 'ch-dd-select',
        main_text: "CHOOSE YOUR DOUBLE DOWN",
        sub_text: "If you opted-in: Sacrifice one RD-3 investment and Double Down on another.",
        background_css: 'bg-red-800',
        host_alert: {
            title: "Double Down Selections Made",
            message: "Double Down selections are complete (if applicable). Click OK to proceed to CH8."
        }
    },

    // CH8 - Cyber Attack
    {
        id: 210,
        title: "CH8 Intro Video - Cyber Attack",
        type: 'video',
        source_url: "placeholder_ch8_intro.mp4",
        auto_advance_after_video: true
    },
    {
        id: 211,
        title: "CH8: Cyber Attack - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch8',
        main_text: "Challenge #8: CYBER ATTACK",
        sub_text: "Teams: Your systems have been compromised. Select your response.",
        timer_duration_seconds: 180,
        background_css: 'bg-red-900',
        host_alert: {
            title: "CH8 Closed",
            message: "CH8 Decisions are in. Click OK for consequences."
        }
    },

    // CH8 Consequences (Slides 212-215)
    {
        id: 212,
        title: "CH8 Consequences Overview Video",
        type: 'video',
        source_url: "placeholder_ch8_consequences.mp4",
        auto_advance_after_video: true
    },
    {
        id: 213,
        title: "CH8 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A",
        sub_text: "Cyber attack response A consequences",
        details: ["Placeholder consequence details"],
        source_url: 'placeholder_ch8_conseq_a.jpg',
        background_css: 'bg-gray-700'
    },
    {
        id: 214,
        title: "CH8 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B",
        sub_text: "Cyber attack response B consequences",
        details: ["Placeholder consequence details"],
        source_url: 'placeholder_ch8_conseq_b.jpg',
        background_css: 'bg-gray-700'
    },
    {
        id: 215,
        title: "CH8 Career Insight Video",
        type: 'video',
        source_url: "placeholder_ch8_career.mp4",
        auto_advance_after_video: false,
        host_alert: {
            title: "CH8 Complete",
            message: "Prepare for CH9. Click OK to proceed."
        }
    },

    // CH9 - Final Challenge
    {
        id: 220,
        title: "CH9 Intro Video - Market Disruption",
        type: 'video',
        source_url: "placeholder_ch9_intro.mp4",
        auto_advance_after_video: true
    },
    {
        id: 221,
        title: "CH9: Market Disruption - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch9',
        main_text: "Challenge #9: MARKET DISRUPTION",
        sub_text: "Teams: A major competitor has disrupted the market. How do you respond?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        host_alert: {
            title: "CH9 Closed",
            message: "Final challenge decisions are in. Click OK for consequences."
        }
    },

    // CH9 Consequences (Slides 222-225)
    {
        id: 222,
        title: "CH9 Consequences Overview Video",
        type: 'video',
        source_url: "placeholder_ch9_consequences.mp4",
        auto_advance_after_video: true
    },
    {
        id: 223,
        title: "CH9 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A",
        sub_text: "Market disruption response A consequences",
        details: ["Placeholder consequence details"],
        source_url: 'placeholder_ch9_conseq_a.jpg',
        background_css: 'bg-gray-700'
    },
    {
        id: 224,
        title: "CH9 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B",
        sub_text: "Market disruption response B consequences",
        details: ["Placeholder consequence details"],
        source_url: 'placeholder_ch9_conseq_b.jpg',
        background_css: 'bg-gray-700'
    },
    {
        id: 225,
        title: "CH9 Career Insight Video",
        type: 'video',
        source_url: "placeholder_ch9_career.mp4",
        auto_advance_after_video: false,
        host_alert: {
            title: "CH9 Complete",
            message: "Prepare for RD-3 Investment Payoffs. Click OK to proceed."
        }
    },

    // RD-3 Investment Payoffs (Slides 230-235)
    {
        id: 230,
        title: "RD-3 Investment Payoff Intro Video",
        type: 'video',
        source_url: "placeholder_rd3_payoff_intro.mp4",
        auto_advance_after_video: true
    },
    {
        id: 231,
        title: "RD-3 Investment Payoffs Reveal",
        type: 'payoff_reveal',
        main_text: "RD-3 Investment Payoffs",
        sub_text: "Your final round investments are now paying off",
        details: ["Investment payoffs will be calculated based on your selections"],
        source_url: 'placeholder_rd3_payoffs.jpg',
        host_alert: {
            title: "RD-3 Payoffs Complete",
            message: "RD-3 investment payoffs revealed. Prepare for Double Down results."
        }
    },

    // Double Down Payoff (Slides 240-242)
    {
        id: 240,
        title: "Double Down Dice Roll Video",
        type: 'double_down_dice_roll',
        main_text: "DOUBLE DOWN DICE ROLL!",
        sub_text: "Let's see how your Double Down gamble paid off...",
        background_css: 'bg-red-700',
        source_url: 'placeholder_dice_roll_video.mp4'
    },
    {
        id: 241,
        title: "Double Down Results Reveal",
        type: 'payoff_reveal',
        main_text: "Double Down Results",
        sub_text: "The dice have determined your fate!",
        details: ["Double Down results will be calculated based on dice roll"],
        source_url: 'placeholder_dd_results.jpg',
        host_alert: {
            title: "Double Down Complete",
            message: "Double Down results revealed. Prepare for final KPIs."
        }
    },

    // Round 3 End (Slides 250-260)
    {
        id: 250,
        title: "End of Round 3 KPIs",
        type: 'kpi_summary_instructional',
        main_text: "END OF ROUND 3 KPIs",
        sub_text: "CFOs: Review your team's final KPIs on your device. This is the end of the simulation!",
        source_url: 'placeholder_rd3_kpis.jpg',
        host_alert: {
            title: "Final KPI Review",
            message: "Ensure teams have reviewed their final KPIs. Click OK for Final Leaderboard."
        }
    },
    {
        id: 251,
        title: "Final Leaderboard Intro Video",
        type: 'video',
        source_url: "placeholder_final_leaderboard_intro.mp4",
        auto_advance_after_video: true
    },
    {
        id: 252,
        title: "Final Leaderboard: Capacity & Orders",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_cap_ord',
        main_text: "Final Leaderboard: Capacity & Orders",
        sub_text: "Final comparison of production capability and market demand."
    },
    {
        id: 253,
        title: "Final Leaderboard: Cost Per Board",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_cpb',
        main_text: "Final Leaderboard: Cost Per Board",
        sub_text: "Final efficiency comparison among all teams."
    },
    {
        id: 254,
        title: "Final Leaderboard: Total Costs",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_costs',
        main_text: "Final Leaderboard: Total Operational Costs",
        sub_text: "Final cost management comparison."
    },
    {
        id: 255,
        title: "Final Leaderboard: ASP",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_asp',
        main_text: "Final Leaderboard: Average Selling Price",
        sub_text: "Final pricing strategy results."
    },
    {
        id: 256,
        title: "Final Leaderboard: Revenue",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_revenue',
        main_text: "Final Leaderboard: Total Revenue",
        sub_text: "Final revenue generation comparison."
    },
    {
        id: 257,
        title: "Final Leaderboard: Net Margin",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_margin',
        main_text: "Final Leaderboard: Net Profit Margin",
        sub_text: "Final profitability percentage comparison."
    },
    {
        id: 258,
        title: "FINAL LEADERBOARD: Net Income (WINNERS!)",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_income',
        main_text: "🏆 FINAL RANKINGS 🏆",
        sub_text: "The ultimate winners of Ready or Not 2.0! Congratulations to all teams!",
        host_alert: {
            title: "Game Complete!",
            message: "The simulation is finished! Click OK for final celebration."
        }
    }
];