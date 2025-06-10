// src/core/content/SlideContent.ts
import {Slide} from '@shared/types/game';

export const allGameSlides: Slide[] = [
    // --- Welcome & Setup (Round 0) ---
    {
        id: 0,
        round_number: 0,
        title: "Welcome",
        type: 'image',
        source_path: 'Slide_001.jpg',
        background_css: 'bg-gray-900'
    },
    {
        id: 1,
        round_number: 0,
        title: "Table Setup 1",
        type: 'image',
        source_path: 'Slide_002.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 2,
        round_number: 0,
        title: "Table Setup 2",
        type: 'image',
        source_path: 'Slide_003.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 3,
        round_number: 0,
        title: "Ready Or Not",
        type: 'image',
        source_path: 'Slide_004.jpg',
        background_css: 'bg-green-700'
    },
    {
        id: 4,
        round_number: 0,
        title: "Game Introduction",
        type: 'video',
        source_path: 'Slide_005.mp4',
        auto_advance_after_video: true
    },
    {
        id: 5,
        round_number: 0,
        title: "Let's Get It On!",
        type: 'video',
        source_path: 'Slide_006.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "Time's Up!",
            message: "Time's Up. When you're ready, click Next to proceed."
        }
    },
    {
        id: 6,
        round_number: 0,
        title: "What Are Investments?",
        type: 'video',
        source_path: 'Slide_007.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "Game Host Action",
            message: "Please hand out one set of RD-1 Investment Cards and one RD-1 Team Summary Sheet to each team."
        }
    },

    // --- Round 1 ---
    {
        id: 7,
        round_number: 1,
        title: "RD-1 Investment Decision Period",
        type: 'interactive_invest',
        source_path: "Slide_008.mp4",
        interactive_data_key: 'rd1-invest',
        main_text: "RD-1 INVEST: TIMER ACTIVE",
        sub_text: "Make all investment decisions on your team device before the video ends.",
        auto_advance_after_video: false,
        background_css: 'bg-slate-800',
        host_alert: {
            title: "Investment Period Complete",
            message: "Before proceeding, please confirm that all teams have finalized and submitted their investment decisions. Once verified, click 'Next' to continue to the next phase."
        }
    },
    {
        id: 8,
        round_number: 1,
        title: "Overview: Years 1 & 2",
        type: 'video',
        source_path: "Slide_009.mp4",
        auto_advance_after_video: true
    },
    {
        id: 9,
        round_number: 1,
        title: "Start Year 1",
        type: 'video',
        source_path: "Slide_010.mp4",
        auto_advance_after_video: true
    },
    {
        id: 10,
        round_number: 1,
        title: "Impact Event #1: Overview",
        type: 'video',
        source_path: "Slide_011.mp4",
        auto_advance_after_video: true,
    },
    {
        id: 11,
        round_number: 1,
        title: "Impact Event #1: The Setup",
        type: 'video',
        source_path: "Slide_012.mp4",
        auto_advance_after_video: true
    },
    {
        id: 12,
        round_number: 1,
        title: "Impact Event #1: Option A",
        type: 'video',
        source_path: "Slide_013.mp4",
        auto_advance_after_video: true
    },
    {
        id: 13,
        round_number: 1,
        title: "Impact Event #1: Option B",
        type: 'video',
        source_path: "Slide_014.mp4",
        auto_advance_after_video: true
    },
    {
        id: 14,
        round_number: 1,
        title: "Impact Event #1: Option C",
        type: 'video',
        source_path: "Slide_015.mp4",
        auto_advance_after_video: true
    },
    {
        id: 15,
        round_number: 1,
        title: "Impact Event #1: Option D",
        type: 'video',
        source_path: "Slide_016.mp4",
        auto_advance_after_video: true
    },
    {
        id: 16,
        round_number: 1,
        title: "Team Phone Guru Instructions",
        type: 'video',
        source_path: "Slide_017.mp4",
        auto_advance_after_video: true
    },
    {
        id: 17,
        round_number: 1,
        title: "CH1: Machinery Failure - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch1',
        main_text: "Challenge #1: MACHINERY FAILURE",
        sub_text: "Teams: Discuss and select your response using your team device. Timer is on screen.",
        timer_duration_seconds: 3 * 60,
        background_css: 'bg-orange-800',
        source_path: "Slide_018.mp4",
        host_alert: {
            title: "Choice 1 Closed",
            message: "All teams submitted or time is up. Click OK to see consequences."
        }
    },
    {
        id: 18,
        round_number: 1,
        title: "Impact Event #1: Options Summary Video",
        type: 'video',
        source_path: "Slide_019.mp4",
        auto_advance_after_video: true
    },
    {
        id: 19,
        round_number: 1,
        title: "Consequences Overview Video Choice 1",
        type: 'video',
        source_path: "Slide_020.mp4",
        auto_advance_after_video: true
    },
    {
        id: 20,
        round_number: 1,
        title: "Choice 1 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A: Purchase CNC Machine",
        sub_text: "Initial Impact: -250 Capacity, +$50k Costs. Long-term: Permanent KPI Card for +500 Capacity in future rounds.",
        details: ["-250 Current Capacity", "+$50k Current Costs", "Permanent KPI Card: +500 Capacity (Future Rounds)"],
        source_path: 'Slide_021.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 21,
        round_number: 1,
        title: "Choice 1 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B: Replacement Die Cast",
        sub_text: "Quick installation, minimal disruption. Initial Impact: +$25k Costs.",
        details: ["-250 Current Capacity (from spreadsheet 'Equip Fail Event')", "+$25k Current Costs"],
        source_path: 'Slide_022.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 22,
        round_number: 1,
        title: "Choice 1 Consequences: Option C Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C: Outsource Fins",
        sub_text: "Flexible capacity, lower initial costs, but less control. Initial Impact: +250 Capacity (net gain), +$25k Costs.",
        details: ["+250 Current Capacity (compared to doing nothing/broken state)", "+$25k Current Costs"],
        source_path: 'Slide_023.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 23,
        round_number: 1,
        title: "Choice 1 Consequences: Option D Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D: Do Nothing",
        sub_text: "Production slowdowns, increased repairs, and cancelled orders. Initial Impact: -500 Capacity, +$75k Costs, -200 Orders.",
        details: ["-500 Current Capacity", "+$75k Current Costs", "-200 Current Orders (from spreadsheet)"],
        source_path: 'Slide_024.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 24,
        round_number: 1,
        title: "Choice 1 Career Insight Video",
        type: 'video',
        source_path: "Slide_025.mp4",
        auto_advance_after_video: true,
    },
    {
        id: 25,
        round_number: 1,
        title: "Choice 1 Transition Video",
        type: 'video',
        source_path: "Slide_026.mp4",
        auto_advance_after_video: true
    },
    {
        id: 26,
        round_number: 1,
        title: "Impact Event #2: Overview",
        type: 'video',
        source_path: "Slide_027.mp4",
        auto_advance_after_video: true
    },
    {
        id: 27,
        round_number: 1,
        title: "Impact Event #2: Setup Video (New Tax)",
        type: 'video',
        source_path: "Slide_028.mp4",
        auto_advance_after_video: true
    },
    {
        id: 28,
        round_number: 1,
        title: "Impact Event #2: Option A Video (Raise Prices)",
        type: 'video',
        source_path: "Slide_029.mp4",
        auto_advance_after_video: true
    },
    {
        id: 29,
        round_number: 1,
        title: "Impact Event #2: Option B Video (Increase Marketing)",
        type: 'video',
        source_path: "Slide_030.mp4",
        auto_advance_after_video: true
    },
    {
        id: 30,
        round_number: 1,
        title: "Impact Event #2: Option C Video (Cost Cutting)",
        type: 'video',
        source_path: "Slide_031.mp4",
        auto_advance_after_video: true
    },
    {
        id: 31,
        round_number: 1,
        title: "Impact Event #2: Option D Video (Do Nothing)",
        type: 'video',
        source_path: "Slide_032.mp4",
        auto_advance_after_video: true
    },
    {
        id: 32,
        round_number: 1,
        title: "CH2: New Tax - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch2',
        main_text: "Challenge #2: NEW TAX",
        sub_text: "Teams: Discuss and select your response using your team device. Timer is on screen.",
        timer_duration_seconds: 3 * 60,
        background_css: 'bg-indigo-800',
        source_path: "Slide_033.mp4",
        host_alert: {
            title: "Choice 2 Closed",
            message: "All teams submitted or time is up. Click OK to see consequences."
        }
    },
    {
        id: 33,
        round_number: 1,
        title: "Impact Event #2: Options Summary Video",
        type: 'video',
        source_path: "Slide_034.mp4",
        auto_advance_after_video: false
    },
    {
        id: 34,
        round_number: 1,
        title: "Consequences Overview Video CH2",
        type: 'video',
        source_path: "Slide_035.mp4",
        auto_advance_after_video: true
    },
    {
        id: 35,
        round_number: 1,
        title: "CH2 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A (Raise Prices)",
        sub_text: "ASP increases by $20. Demand stable.",
        details: ["+$20 ASP", "-250 Orders (per spreadsheet)"],
        source_path: 'Slide_036.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 36,
        round_number: 1,
        title: "CH2 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B (Increase Marketing)",
        sub_text: "Orders increase by 500, Marketing Costs increase by $25k.",
        details: ["+500 Orders", "+$25k Costs"],
        source_path: 'Slide_037.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 37,
        round_number: 1,
        title: "CH2 Consequences: Option C Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C (Cost Cutting)",
        sub_text: "Costs decrease by $25k, but Capacity drops by 250 due to morale/service cuts.",
        details: ["-250 Capacity", "-$25k Costs"],
        source_path: 'Slide_038.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 38,
        round_number: 1,
        title: "CH2 Consequences: Option D Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D (Do Nothing - New Tax)",
        sub_text: "Operational costs increase by $50k due to absorbing the new tax.",
        details: ["+$50k Costs (New Tax)"],
        source_path: 'Slide_039.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 39,
        round_number: 1,
        title: "CH2 Career Insight Video",
        type: 'video',
        source_path: "Slide_040.mp4",
        auto_advance_after_video: false,
        host_alert: {title: "Impact Event #2 Complete", message: "Prepare for Impact Event #3. Click OK to proceed."}
    },
    {
        id: 40,
        round_number: 1,
        title: "Transition to later in Year 2 Video",
        type: 'video',
        source_path: "Slide_041.mp4",
        auto_advance_after_video: true
    },
    {
        id: 41,
        round_number: 1,
        title: "News Broadcast Video (Mid Year 2 - Recession)",
        type: 'video',
        source_path: "Slide_042.mp4",
        auto_advance_after_video: true
    },
    {
        id: 42,
        round_number: 1,
        title: "Impact Event #3: Setup Video (Recession)",
        type: 'video',
        source_path: "Slide_043.mp4",
        auto_advance_after_video: true
    },
    {
        id: 43,
        round_number: 1,
        title: "Impact Event #3: Option A Video (Layoffs)",
        type: 'video',
        source_path: "Slide_044.mp4",
        auto_advance_after_video: true
    },
    {
        id: 44,
        round_number: 1,
        title: "Impact Event #3: Option B Video (Furlough/Workshare)",
        type: 'video',
        source_path: "Slide_045.mp4",
        auto_advance_after_video: true
    },
    {
        id: 45,
        round_number: 1,
        title: "Impact Event #3: Option C Video (Maintain/Cut OT)",
        type: 'video',
        source_path: "Slide_046.mp4",
        auto_advance_after_video: true
    },
    {
        id: 46,
        round_number: 1,
        title: "Impact Event #3: Option D Video (Do Nothing)",
        type: 'video',
        source_path: "Slide_047.mp4",
        auto_advance_after_video: true
    },
    {
        id: 47,
        round_number: 1,
        title: "CH3: Recession - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch3',
        main_text: "Challenge #3: RECESSION",
        sub_text: "Teams: Discuss and select your response using your team device. Timer is on screen.",
        timer_duration_seconds: 3 * 60,
        background_css: 'bg-teal-800',
        source_path: "Slide_048.mp4",
        host_alert: {
            title: "Choice 3 Closed",
            message: "All teams submitted or time is up. Click OK to see consequences."
        }
    },
    {
        id: 48,
        round_number: 1,
        title: "Impact Event #3: Options Summary Video",
        type: 'video',
        source_path: "Slide_049.mp4",
        auto_advance_after_video: false
    },
    {
        id: 49,
        round_number: 1,
        title: "Consequences Overview Video CH3",
        type: 'video',
        source_path: "Slide_050.mp4",
        auto_advance_after_video: true
    },
    {
        id: 50,
        round_number: 1,
        title: "CH3 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A (Layoffs)",
        sub_text: "Significant cost reduction and capacity decrease. Future capacity also impacted.",
        details: ["-1250 Current Capacity", "-$300k Current Costs", "Permanent KPI Card: -1000 Capacity (Future - per spreadsheet)"],
        source_path: 'Slide_051.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 51,
        round_number: 1,
        title: "CH3 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B (Furlough/Workshare)",
        sub_text: "Reduces costs and capacity, but less severely than full layoffs.",
        details: ["-1000 Current Capacity", "-$200k Current Costs"],
        source_path: 'Slide_052.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 52,
        round_number: 1,
        title: "CH3 Consequences: Option C Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C (Maintain/Cut OT)",
        sub_text: "Moderate cost savings with a smaller capacity hit.",
        details: ["-500 Current Capacity", "-$100k Current Costs"],
        source_path: 'Slide_053.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 53,
        round_number: 1,
        title: "CH3 Consequences: Option D Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D (Do Nothing - Recession)",
        sub_text: "Demand drops significantly, and unchanged fixed costs hurt margins. Morale issues reduce capacity.",
        details: ["-1000 Current Orders (Demand Drop)", "-1000 Current Capacity (Morale/Quits)", "+$25k Current Costs (Inefficiency/Admin)"],
        source_path: "Slide_054.mp4",
        background_css: 'bg-gray-700'
    },
    {
        id: 54,
        round_number: 1,
        title: "CH3 Career Insight Video",
        type: 'video',
        source_path: "Slide_055.mp4",
        auto_advance_after_video: false,
        host_alert: {
            title: "Impact Event #3 Complete",
            message: "Prepare for RD-1 Investment Payoffs. Click OK to proceed."
        }
    },
    {
        id: 55,
        round_number: 1,
        title: "RD-1 Investment Payoff Intro Video",
        type: 'video',
        source_path: "Slide_056.mp4",
        auto_advance_after_video: true
    },
    {
        id: 56,
        round_number: 1,
        title: "Payoff: #1 Biz Growth Strategy",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Business Growth Strategy",
        sub_text: "Impact: Capacity: +250, Orders: +250, ASP: +$20",
        details: ["+250 Capacity", "+250 Orders", "+$20 ASP"],
        source_path: 'Slide_057.mp4'
    },
    {
        id: 57,
        round_number: 1,
        title: "Payoff: #2 Production Efficiency",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Production Efficiency",
        sub_text: "Impact: Capacity: +1500",
        details: ["+1500 Capacity"],
        source_path: 'Slide_058.mp4'
    },
    {
        id: 58,
        round_number: 1,
        title: "Payoff: #3 Add 2nd Shift",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Add 2nd Shift",
        sub_text: "Impact: Capacity: +1500, Costs: +$300k",
        details: ["+1500 Capacity", "+$300k Costs"],
        source_path: 'Slide_059.mp4'
    },
    {
        id: 59,
        round_number: 1,
        title: "Payoff: #4 Supply Chain Optimization",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Supply Chain Optimization",
        sub_text: "Impact: Capacity: +250, Costs: -$100k",
        details: ["+250 Capacity", "-$100k Costs"],
        source_path: 'Slide_060.mp4'
    },
    {
        id: 60,
        round_number: 1,
        title: "Payoff: #5 Employee Development",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Employee Development",
        sub_text: "Impact: Capacity: +250, Costs: -$25k",
        details: ["+250 Capacity", "-$25k Costs"],
        source_path: 'Slide_061.mp4'
    },
    {
        id: 61,
        round_number: 1,
        title: "Payoff: #6 Maximize Sales (Boutique)",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Maximize Sales (Boutique)",
        sub_text: "Impact: Orders: +500, ASP: +$20",
        details: ["+500 Orders", "+$20 ASP"],
        source_path: 'Slide_062.mp4',
        host_alert: {
            title: "RD-1 Payoffs Complete",
            message: "All investment payoffs for Round 1 have been revealed. Click OK to review End of Round KPIs."
        }
    },
    {
        id: 62,
        round_number: 1,
        title: "End of Round 1 KPIs",
        type: 'kpi_summary_instructional',
        main_text: "END OF ROUND 1 KPIs",
        sub_text: "CFOs: Review your team's final KPIs on your device and record them on your Team Summary Sheet. The facilitator will display the leaderboard next.",
        source_path: 'Slide_063.mp4',
        host_alert: {
            title: "KPI Review",
            message: "Ensure teams have reviewed their KPIs. Click OK to display the Leaderboard."
        }
    },
    {
        id: 63,
        round_number: 1,
        title: "RD-1 Leaderboard Intro Video",
        type: 'video',
        source_path: "Slide_064.mp4",
        auto_advance_after_video: true
    },
    {
        id: 63.1,
        round_number: 1,
        title: "Leaderboard: RD-1 Capacity & Orders",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_cap_ord',
        main_text: "RD-1 Leaderboard: Capacity & Orders",
        sub_text: "Team comparison of production capability and market demand generated."
    },
    {
        id: 63.2,
        round_number: 1,
        title: "Leaderboard: RD-1 Cost Per Board",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_cpb',
        main_text: "RD-1 Leaderboard: Cost Per Board",
        sub_text: "Comparing efficiency in production costs among teams."
    },
    {
        id: 63.3,
        round_number: 1,
        title: "Leaderboard: RD-1 Total Costs",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_costs',
        main_text: "RD-1 Leaderboard: Total Operational Costs",
        sub_text: "Overall spending by each team in Round 1."
    },
    {
        id: 63.4,
        round_number: 1,
        title: "Leaderboard: RD-1 ASP",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_asp',
        main_text: "RD-1 Leaderboard: Average Selling Price (ASP)",
        sub_text: "Team pricing power and strategy in the market."
    },
    {
        id: 63.5,
        round_number: 1,
        title: "Leaderboard: RD-1 Revenue",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_revenue',
        main_text: "RD-1 Leaderboard: Total Revenue",
        sub_text: "Comparing total income generated from sales."
    },
    {
        id: 63.6,
        round_number: 1,
        title: "Leaderboard: RD-1 Net Margin",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_margin',
        main_text: "RD-1 Leaderboard: Net Profit Margin",
        sub_text: "Profitability as a percentage of revenue for each team."
    },
    {
        id: 63.7,
        round_number: 1,
        title: "Leaderboard: RD-1 Net Income (RANKED)",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_income',
        main_text: "🏆 FINAL RANKINGS 🏆",
        sub_text: "Final profit ranking for Round 1. Click OK to proceed to Round 2 setup.",
        host_alert: {
            title: "Round 1 Complete!",
            message: "Round 1 is concluded. Click OK to prepare for Round 2."
        }
    },

    // --- Round 2 ---
    {
        id: 64,
        round_number: 2,
        title: "Round 2 Introduction Video",
        type: 'video',
        source_path: "Slide_065.mp4",
        auto_advance_after_video: false,
        host_alert: {
            title: "Begin RD-2 Investments",
            message: "The RD-2 Investment overview video will play next, followed by the investment period. Ensure teams are ready."
        }
    },
    {
        id: 65,
        round_number: 2,
        title: "RD-2 Investment Decision Period",
        type: 'interactive_invest',
        source_path: "Slide_070.mp4",
        interactive_data_key: 'rd2-invest',
        main_text: "RD-2 INVEST: TIMER ACTIVE",
        sub_text: "Video timer active. Make your RD-2 investment decisions on your team device.",
        auto_advance_after_video: false,
        host_alert: {
            title: "RD-2 Investment Period Ended",
            message: "RD-2 investments are closed. Click OK to proceed."
        }
    },
    {
        id: 66,
        round_number: 2,
        title: "RD-2 CH4 Intro Video",
        type: 'video',
        source_path: "Slide_071.mp4",
        auto_advance_after_video: true
    },
    {
        id: 67,
        round_number: 2,
        title: "CH4: Supply Chain Disruption - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch4',
        main_text: "Challenge #4: SUPPLY CHAIN DISRUPTION",
        sub_text: "Teams: Discuss and select your response using your team device.",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-800',
        source_path: "Slide_072.mp4",
        host_alert: {
            title: "CH4 Closed",
            message: "CH4 Decisions are in. Click OK for consequences."
        }
    },
    {
        id: 68,
        round_number: 2,
        title: "CH4 Consequences Overview Video",
        type: 'video',
        source_path: "Slide_073.mp4",
        auto_advance_after_video: true
    },
    {
        id: 69,
        round_number: 2,
        title: "CH4 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A",
        sub_text: "Supply chain consequence A details",
        details: ["Placeholder consequence details"],
        source_path: 'Slide_074.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 70,
        round_number: 2,
        title: "CH4 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B",
        sub_text: "Supply chain consequence B details",
        details: ["Placeholder consequence details"],
        source_path: 'Slide_075.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 71,
        round_number: 2,
        title: "CH4 Career Insight Video",
        type: 'video',
        source_path: "Slide_076.mp4",
        auto_advance_after_video: false,
        host_alert: {
            title: "CH4 Complete",
            message: "Prepare for next challenge. Click OK to proceed."
        }
    },
    {
        id: 72,
        round_number: 2,
        title: "CH5 Intro Video - Labor Strike",
        type: 'video',
        source_path: "placeholder_ch5_intro.mp4",
        auto_advance_after_video: true
    },
    {
        id: 73,
        round_number: 2,
        title: "CH5: Labor Strike - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch5',
        main_text: "Challenge #5: LABOR STRIKE",
        sub_text: "Teams: Discuss and select your response.",
        timer_duration_seconds: 180,
        background_css: 'bg-red-800',
        source_path: "placeholder_ch5_interactive.mp4",
        host_alert: {title: "CH5 Closed", message: "CH5 Decisions are in. Click OK for consequences."}
    },
    {
        id: 74,
        round_number: 2,
        title: "CH5 Consequences Overview Video",
        type: 'video',
        source_path: "placeholder_ch5_consequences.mp4",
        auto_advance_after_video: true
    },
    {
        id: 75,
        round_number: 2,
        title: "CH5 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A",
        sub_text: "Labor strike response A consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch5_conseq_a.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 76,
        round_number: 2,
        title: "CH5 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B",
        sub_text: "Labor strike response B consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch5_conseq_b.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 77,
        round_number: 2,
        title: "CH5 Consequences: Option C Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C",
        sub_text: "Labor strike response C consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch5_conseq_c.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 78,
        round_number: 2,
        title: "CH5 Consequences: Option D Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D",
        sub_text: "Labor strike response D consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch5_conseq_d.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 79,
        round_number: 2,
        title: "CH5 Career Insight Video",
        type: 'video',
        source_path: "placeholder_ch5_career.mp4",
        auto_advance_after_video: false,
        host_alert: {title: "CH5 Complete", message: "Prepare for next challenge. Click OK to proceed."}
    },
    {
        id: 80,
        round_number: 2,
        title: "CH6 Intro Video - Market Shift",
        type: 'video',
        source_path: "placeholder_ch6_intro.mp4",
        auto_advance_after_video: true
    },
    {
        id: 81,
        round_number: 2,
        title: "CH6: Market Shift - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch6',
        main_text: "Challenge #6: MARKET SHIFT",
        sub_text: "Teams: Discuss and select your response.",
        timer_duration_seconds: 180,
        background_css: 'bg-blue-800',
        source_path: "placeholder_ch6_interactive.mp4",
        host_alert: {title: "CH6 Closed", message: "CH6 Decisions are in. Click OK for consequences."}
    },
    {
        id: 82,
        round_number: 2,
        title: "CH6 Consequences Overview Video",
        type: 'video',
        source_path: "placeholder_ch6_consequences.mp4",
        auto_advance_after_video: true
    },
    {
        id: 83,
        round_number: 2,
        title: "CH6 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A",
        sub_text: "Market shift response A consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch6_conseq_a.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 84,
        round_number: 2,
        title: "CH6 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B",
        sub_text: "Market shift response B consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch6_conseq_b.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 85,
        round_number: 2,
        title: "CH6 Consequences: Option C Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C",
        sub_text: "Market shift response C consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch6_conseq_c.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 86,
        round_number: 2,
        title: "CH6 Consequences: Option D Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D",
        sub_text: "Market shift response D consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch6_conseq_d.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 87,
        round_number: 2,
        title: "CH6 Career Insight Video",
        type: 'video',
        source_path: "placeholder_ch6_career.mp4",
        auto_advance_after_video: false,
        host_alert: {title: "CH6 Complete", message: "Prepare for next challenge. Click OK to proceed."}
    },
    {
        id: 88,
        round_number: 2,
        title: "CH7 Intro Video - Regulation",
        type: 'video',
        source_path: "placeholder_ch7_intro.mp4",
        auto_advance_after_video: true
    },
    {
        id: 89,
        round_number: 2,
        title: "CH7: Regulation - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch7',
        main_text: "Challenge #7: REGULATION",
        sub_text: "Teams: Discuss and select your response.",
        timer_duration_seconds: 180,
        background_css: 'bg-green-800',
        source_path: "placeholder_ch7_interactive.mp4",
        host_alert: {title: "CH7 Closed", message: "CH7 Decisions are in. Click OK for consequences."}
    },
    {
        id: 90,
        round_number: 2,
        title: "CH7 Consequences Overview Video",
        type: 'video',
        source_path: "placeholder_ch7_consequences.mp4",
        auto_advance_after_video: true
    },
    {
        id: 91,
        round_number: 2,
        title: "CH7 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A",
        sub_text: "Regulation response A consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch7_conseq_a.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 92,
        round_number: 2,
        title: "CH7 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B",
        sub_text: "Regulation response B consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch7_conseq_b.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 93,
        round_number: 2,
        title: "CH7 Consequences: Option C Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C",
        sub_text: "Regulation response C consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch7_conseq_c.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 94,
        round_number: 2,
        title: "CH7 Consequences: Option D Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D",
        sub_text: "Regulation response D consequences",
        details: ["Placeholder consequence details"],
        source_path: 'placeholder_ch7_conseq_d.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 95,
        round_number: 2,
        title: "CH7 Career Insight Video",
        type: 'video',
        source_path: "placeholder_ch7_career.mp4",
        auto_advance_after_video: false,
        host_alert: {title: "CH7 Complete", message: "Prepare for RD-2 Investment Payoffs. Click OK to proceed."}
    },
    {
        id: 96,
        round_number: 2,
        title: "RD-2 Investment Payoff Intro Video",
        type: 'video',
        source_path: "Slide_077.mp4",
        auto_advance_after_video: true
    },
    {
        id: 97,
        round_number: 2,
        title: "RD-2 Payoffs Reveal",
        type: 'payoff_reveal',
        main_text: "RD-2 Investment Payoffs",
        sub_text: "Your Round 2 investments are now paying off",
        details: ["Investment payoffs will be calculated based on your selections"],
        source_path: 'Slide_078.mp4',
        host_alert: {
            title: "RD-2 Payoffs Complete",
            message: "All investment payoffs for Round 2 have been revealed. Click OK to review KPIs."
        }
    },
    {
        id: 98,
        round_number: 2,
        title: "End of Round 2 KPIs",
        type: 'kpi_summary_instructional',
        main_text: "END OF ROUND 2 KPIs",
        sub_text: "CFOs: Review your team's final KPIs on your device and record them on your Team Summary Sheet.",
        source_path: 'Slide_079.mp4',
        host_alert: {
            title: "RD-2 KPI Review",
            message: "Ensure teams have reviewed their KPIs. Click OK to display the Leaderboard."
        }
    },
    {
        id: 99,
        round_number: 2,
        title: "RD-2 Leaderboard Intro Video",
        type: 'video',
        source_path: "Slide_080.mp4",
        auto_advance_after_video: true
    },
    {
        id: 99.1,
        round_number: 2,
        title: "Leaderboard: RD-2 Capacity & Orders",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_cap_ord',
        main_text: "RD-2 Leaderboard: Capacity & Orders",
        sub_text: "Team comparison of production capability and market demand after Round 2."
    },
    {
        id: 99.2,
        round_number: 2,
        title: "Leaderboard: RD-2 Cost Per Board",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_cpb',
        main_text: "RD-2 Leaderboard: Cost Per Board",
        sub_text: "Comparing efficiency in production costs among teams after Round 2."
    },
    {
        id: 99.3,
        round_number: 2,
        title: "Leaderboard: RD-2 Total Costs",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_costs',
        main_text: "RD-2 Leaderboard: Total Operational Costs",
        sub_text: "Overall spending by each team in Round 2."
    },
    {
        id: 99.4,
        round_number: 2,
        title: "Leaderboard: RD-2 ASP",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_asp',
        main_text: "RD-2 Leaderboard: Average Selling Price (ASP)",
        sub_text: "Team pricing power and strategy after Round 2."
    },
    {
        id: 99.5,
        round_number: 2,
        title: "Leaderboard: RD-2 Revenue",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_revenue',
        main_text: "RD-2 Leaderboard: Total Revenue",
        sub_text: "Comparing total income generated from sales in Round 2."
    },
    {
        id: 99.6,
        round_number: 2,
        title: "Leaderboard: RD-2 Net Margin",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_margin',
        main_text: "RD-2 Leaderboard: Net Profit Margin",
        sub_text: "Profitability as a percentage of revenue for each team."
    },
    {
        id: 99.7,
        round_number: 2,
        title: "Leaderboard: RD-2 Net Income (RANKED)",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd2_leaderboard_income',
        main_text: "RD-2 Leaderboard: Net Income (Overall Ranking)",
        sub_text: "Final profit ranking for Round 2. Click OK to proceed to Round 3 setup.",
        host_alert: {
            title: "Round 2 Complete!",
            message: "Round 2 is concluded. Click OK to prepare for Round 3."
        }
    },

    // --- Round 3 ---
    {
        id: 100,
        round_number: 3,
        title: "Round 3 Introduction Video",
        type: 'video',
        source_path: "Slide_081.mp4",
        auto_advance_after_video: false,
        host_alert: {
            title: "Begin RD-3 Investments",
            message: "Teams will now make RD-3 Investments. The timer video will begin."
        }
    },
    {
        id: 101,
        round_number: 3,
        title: "RD-3 Investment Decision Period",
        type: 'interactive_invest',
        source_path: "Slide_082.mp4",
        interactive_data_key: 'rd3-invest',
        main_text: "RD-3 INVEST: TIMER ACTIVE",
        sub_text: "Video timer active. Make your RD-3 investment decisions.",
        auto_advance_after_video: false,
        host_alert: {
            title: "RD-3 Investments Closed",
            message: "RD-3 investments are closed. Prepare for Double Down. Click OK."
        }
    },
    {
        id: 102,
        round_number: 3,
        title: "Double Down Opportunity Decision",
        type: 'interactive_double_down_prompt',
        interactive_data_key: 'ch-dd-prompt',
        main_text: "DOUBLE DOWN OPPORTUNITY!",
        sub_text: "Decide if your team wants to take the Double Down risk/reward. Timer on screen.",
        timer_duration_seconds: 3 * 60,
        background_css: 'bg-red-700',
        source_path: 'Slide_083.mp4',
        host_alert: {
            title: "Double Down Decision Closed",
            message: "Teams have made their Double Down choice. Click OK for selection or to skip to CH8."
        }
    },
    {
        id: 103,
        round_number: 3,
        title: "Select Double Down Investments",
        type: 'interactive_double_down_select',
        interactive_data_key: 'ch-dd-select',
        main_text: "CHOOSE YOUR DOUBLE DOWN",
        sub_text: "If you opted-in: Sacrifice one RD-3 investment and Double Down on another.",
        background_css: 'bg-red-800',
        source_path: 'Slide_084.mp4',
        host_alert: {
            title: "Double Down Selections Made",
            message: "Double Down selections are complete (if applicable). Click OK to proceed to CH8."
        }
    },
    {
        id: 104,
        round_number: 3,
        title: "CH8 Intro Video - Cyber Attack",
        type: 'video',
        source_path: "Slide_085.mp4",
        auto_advance_after_video: true
    },
    {
        id: 105,
        round_number: 3,
        title: "CH8: Cyber Attack - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch8',
        main_text: "Challenge #8: CYBER ATTACK",
        sub_text: "Teams: Your systems have been compromised. Select your response.",
        timer_duration_seconds: 180,
        background_css: 'bg-red-900',
        source_path: 'Slide_086.mp4',
        host_alert: {
            title: "CH8 Closed",
            message: "CH8 Decisions are in. Click OK for consequences."
        }
    },
    {
        id: 106,
        round_number: 3,
        title: "CH8 Consequences Overview Video",
        type: 'video',
        source_path: "Slide_087.mp4",
        auto_advance_after_video: true
    },
    {
        id: 107,
        round_number: 3,
        title: "CH8 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A",
        sub_text: "Cyber attack response A consequences",
        details: ["Placeholder consequence details"],
        source_path: 'Slide_088.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 108,
        round_number: 3,
        title: "CH8 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B",
        sub_text: "Cyber attack response B consequences",
        details: ["Placeholder consequence details"],
        source_path: 'Slide_089.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 109,
        round_number: 3,
        title: "CH8 Career Insight Video",
        type: 'video',
        source_path: "Slide_090.mp4",
        auto_advance_after_video: false,
        host_alert: {
            title: "CH8 Complete",
            message: "Prepare for CH9. Click OK to proceed."
        }
    },
    {
        id: 110,
        round_number: 3,
        title: "CH9 Intro Video - Market Disruption",
        type: 'video',
        source_path: "Slide_091.mp4",
        auto_advance_after_video: true
    },
    {
        id: 111,
        round_number: 3,
        title: "CH9: Market Disruption - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch9',
        main_text: "Challenge #9: MARKET DISRUPTION",
        sub_text: "Teams: A major competitor has disrupted the market. How do you respond?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        source_path: 'Slide_092.mp4',
        host_alert: {
            title: "CH9 Closed",
            message: "Final challenge decisions are in. Click OK for consequences."
        }
    },
    {
        id: 112,
        round_number: 3,
        title: "CH9 Consequences Overview Video",
        type: 'video',
        source_path: "Slide_093.mp4",
        auto_advance_after_video: true
    },
    {
        id: 113,
        round_number: 3,
        title: "CH9 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A",
        sub_text: "Market disruption response A consequences",
        details: ["Placeholder consequence details"],
        source_path: 'Slide_094.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 114,
        round_number: 3,
        title: "CH9 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B",
        sub_text: "Market disruption response B consequences",
        details: ["Placeholder consequence details"],
        source_path: 'Slide_095.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 115,
        round_number: 3,
        title: "CH9 Career Insight Video",
        type: 'video',
        source_path: "Slide_096.mp4",
        auto_advance_after_video: false,
        host_alert: {
            title: "CH9 Complete",
            message: "Prepare for RD-3 Investment Payoffs. Click OK to proceed."
        }
    },
    {
        id: 116,
        round_number: 3,
        title: "RD-3 Investment Payoff Intro Video",
        type: 'video',
        source_path: "Slide_097.mp4",
        auto_advance_after_video: true
    },
    {
        id: 117,
        round_number: 3,
        title: "RD-3 Investment Payoffs Reveal",
        type: 'payoff_reveal',
        main_text: "RD-3 Investment Payoffs",
        sub_text: "Your final round investments are now paying off",
        details: ["Investment payoffs will be calculated based on your selections"],
        source_path: 'Slide_098.mp4',
        host_alert: {
            title: "RD-3 Payoffs Complete",
            message: "RD-3 investment payoffs revealed. Prepare for Double Down results."
        }
    },
    {
        id: 118,
        round_number: 3,
        title: "Double Down Dice Roll Video",
        type: 'double_down_dice_roll',
        main_text: "DOUBLE DOWN DICE ROLL!",
        sub_text: "Let's see how your Double Down gamble paid off...",
        background_css: 'bg-red-700',
        source_path: 'Slide_099.mp4'
    },
    {
        id: 119,
        round_number: 3,
        title: "Double Down Results Reveal",
        type: 'payoff_reveal',
        main_text: "Double Down Results",
        sub_text: "The dice have determined your fate!",
        details: ["Double Down results will be calculated based on dice roll"],
        source_path: 'Slide_100.mp4',
        host_alert: {
            title: "Double Down Complete",
            message: "Double Down results revealed. Prepare for final KPIs."
        }
    },
    {
        id: 120,
        round_number: 3,
        title: "End of Round 3 KPIs",
        type: 'kpi_summary_instructional',
        main_text: "END OF ROUND 3 KPIs",
        sub_text: "CFOs: Review your team's final KPIs on your device. This is the end of the simulation!",
        source_path: 'Slide_101.mp4',
        host_alert: {
            title: "Final KPI Review",
            message: "Ensure teams have reviewed their final KPIs. Click OK for Final Leaderboard."
        }
    },
    {
        id: 121,
        round_number: 3,
        title: "Final Leaderboard Intro Video",
        type: 'video',
        source_path: "Slide_102.mp4",
        auto_advance_after_video: true
    },
    {
        id: 121.1,
        round_number: 3,
        title: "Final Leaderboard: Capacity & Orders",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_cap_ord',
        main_text: "Final Leaderboard: Capacity & Orders",
        sub_text: "Final comparison of production capability and market demand."
    },
    {
        id: 121.2,
        round_number: 3,
        title: "Final Leaderboard: Cost Per Board",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_cpb',
        main_text: "Final Leaderboard: Cost Per Board",
        sub_text: "Final efficiency comparison among all teams."
    },
    {
        id: 121.3,
        round_number: 3,
        title: "Final Leaderboard: Total Costs",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_costs',
        main_text: "Final Leaderboard: Total Operational Costs",
        sub_text: "Overall spending by each team in Round 3."
    },
    {
        id: 121.4,
        round_number: 3,
        title: "Final Leaderboard: ASP",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_asp',
        main_text: "Final Leaderboard: Average Selling Price",
        sub_text: "Final pricing strategy results."
    },
    {
        id: 121.5,
        round_number: 3,
        title: "Final Leaderboard: Revenue",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_revenue',
        main_text: "Final Leaderboard: Total Revenue",
        sub_text: "Final revenue generation comparison."
    },
    {
        id: 121.6,
        round_number: 3,
        title: "Final Leaderboard: Net Margin",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd3_leaderboard_margin',
        main_text: "Final Leaderboard: Net Profit Margin",
        sub_text: "Final profitability percentage comparison."
    },
    {
        id: 121.7,
        round_number: 3,
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
