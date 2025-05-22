// src/data/gameStructure/round2/slides.ts
import { Slide } from '../../../types';

export const round2Slides: Slide[] = [
    // Round 2 Introduction and Investment
    {
        id: 100,
        title: "Round 2 Introduction Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_065.mp4?alt=media",
        auto_advance_after_video: false,
        teacher_alert: {
            title: "Begin RD-2 Investments",
            message: "The RD-2 Investment overview video will play next, followed by the investment period. Ensure teams are ready."
        }
    },
    {
        id: 101,
        title: "RD-2 Investment Decision Period",
        type: 'interactive_invest',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_070.mp4?alt=media",
        interactive_data_key: 'rd2-invest',
        main_text: "RD-2 INVEST: TIMER ACTIVE",
        sub_text: "Video timer active. Make your RD-2 investment decisions on your team device.",
        auto_advance_after_video: false,
        teacher_alert: {
            title: "RD-2 Investment Period Ended",
            message: "RD-2 investments are closed. Click OK to proceed."
        }
    },

    // CH4 - Supply Chain Disruption
    {
        id: 102,
        title: "RD-2 CH4 Intro Video",
        type: 'video',
        source_url: "placeholder_rd2_ch4_intro.mp4",
        auto_advance_after_video: true
    },
    {
        id: 103,
        title: "CH4: Supply Chain Disruption - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch4',
        main_text: "Challenge #4: SUPPLY CHAIN DISRUPTION",
        sub_text: "Teams: Discuss and select your response using your team device.",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-800',
        teacher_alert: {
            title: "CH4 Closed",
            message: "CH4 Decisions are in. Click OK for consequences."
        }
    },

    // CH4 Consequences (Slides 104-107)
    {
        id: 104,
        title: "CH4 Consequences Overview Video",
        type: 'video',
        source_url: "placeholder_ch4_consequences.mp4",
        auto_advance_after_video: true
    },
    {
        id: 105,
        title: "CH4 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A",
        sub_text: "Supply chain consequence A details",
        details: ["Placeholder consequence details"],
        source_url: 'placeholder_ch4_conseq_a.jpg',
        background_css: 'bg-gray-700'
    },
    {
        id: 106,
        title: "CH4 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B",
        sub_text: "Supply chain consequence B details",
        details: ["Placeholder consequence details"],
        source_url: 'placeholder_ch4_conseq_b.jpg',
        background_css: 'bg-gray-700'
    },
    {
        id: 107,
        title: "CH4 Career Insight Video",
        type: 'video',
        source_url: "placeholder_ch4_career.mp4",
        auto_advance_after_video: false,
        teacher_alert: {
            title: "CH4 Complete",
            message: "Prepare for next challenge. Click OK to proceed."
        }
    },

    // RD-2 Investment Payoffs (Slides 120-125)
    {
        id: 120,
        title: "RD-2 Investment Payoff Intro Video",
        type: 'video',
        source_url: "placeholder_rd2_payoff_intro.mp4",
        auto_advance_after_video: true
    },
    {
        id: 121,
        title: "RD-2 Payoffs Reveal",
        type: 'payoff_reveal',
        main_text: "RD-2 Investment Payoffs",
        sub_text: "Your Round 2 investments are now paying off",
        details: ["Investment payoffs will be calculated based on your selections"],
        source_url: 'placeholder_rd2_payoffs.jpg',
        teacher_alert: {
            title: "RD-2 Payoffs Complete",
            message: "All investment payoffs for Round 2 have been revealed. Click OK to review KPIs."
        }
    },

    // Round 2 End (Slides 130-137)
    {
        id: 130,
        title: "End of Round 2 KPIs",
        type: 'kpi_summary_instructional',
        main_text: "END OF ROUND 2 KPIs",
        sub_text: "CFOs: Review your team's final KPIs on your device and record them on your Team Summary Sheet.",
        source_url: 'placeholder_rd2_kpis.jpg',
        teacher_alert: {
            title: "RD-2 KPI Review",
            message: "Ensure teams have reviewed their KPIs. Click OK to display the Leaderboard."
        }
    },
    {
        id: 131,
        title: "RD-2 Leaderboard Intro Video",
        type: 'video',
        source_url: "placeholder_rd2_leaderboard_intro.mp4",
        auto_advance_after_video: true
    },
    {
        id: 132,
        title: "Leaderboard: RD-2 Capacity & Orders",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_cap_ord',
        main_text: "RD-2 Leaderboard: Capacity & Orders",
        sub_text: "Team comparison of production capability and market demand after Round 2."
    },
    {
        id: 133,
        title: "Leaderboard: RD-2 Cost Per Board",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_cpb',
        main_text: "RD-2 Leaderboard: Cost Per Board",
        sub_text: "Comparing efficiency in production costs among teams after Round 2."
    },
    {
        id: 134,
        title: "Leaderboard: RD-2 Total Costs",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_costs',
        main_text: "RD-2 Leaderboard: Total Operational Costs",
        sub_text: "Overall spending by each team in Round 2."
    },
    {
        id: 135,
        title: "Leaderboard: RD-2 ASP",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_asp',
        main_text: "RD-2 Leaderboard: Average Selling Price (ASP)",
        sub_text: "Team pricing power and strategy after Round 2."
    },
    {
        id: 136,
        title: "Leaderboard: RD-2 Revenue",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_revenue',
        main_text: "RD-2 Leaderboard: Total Revenue",
        sub_text: "Comparing total income generated from sales in Round 2."
    },
    {
        id: 137,
        title: "Leaderboard: RD-2 Net Income (RANKED)",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_income',
        main_text: "RD-2 Leaderboard: Net Income (Overall Ranking)",
        sub_text: "Final profit ranking for Round 2. Click OK to proceed to Round 3 setup.",
        teacher_alert: {
            title: "Round 2 Complete!",
            message: "Round 2 is concluded. Click OK to prepare for Round 3."
        }
    }
];