// src/core/content/SlideContent.ts
import {Slide} from '@shared/types/game';

export const allGameSlides: Slide[] = [
    // --- Welcome & Setup (Round 0) ---
    {
        id: 0,
        round_number: 0,
        title: "Host Guide",
        type: 'image',
        source_path: 'Slide_001.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 1,
        round_number: 0,
        title: "Table Setup - 8 Players",
        type: 'image',
        source_path: 'Slide_002.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 2,
        round_number: 0,
        title: "Table Setup - 4 Players",
        type: 'image',
        source_path: 'Slide_003.jpg',
        background_css: 'bg-gray-200'
    },
    {
        id: 3,
        round_number: 0,
        title: "Welcome to Ready Or Not",
        type: 'image',
        source_path: 'Slide_004.jpg',
        background_css: 'bg-green-700'
    },
    {
        id: 4,
        round_number: 0,
        title: "Game Introduction Video",
        type: 'video',
        source_path: 'Slide_005.mp4',
        auto_advance_after_video: true
    },
    {
        id: 5,
        round_number: 0,
        title: "Let's Get It On - SWOT Analysis",
        type: 'video',
        source_path: 'Slide_006.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "15 Minutes for SWOT Analysis",
            message: "Teams have 15 minutes to read materials and complete SWOT analysis. Click Next when ready to proceed."
        }
    },
    {
        id: 6,
        round_number: 0,
        title: "Round 1 Investments Introduction",
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
        title: "Entering Round 1",
        type: 'video',
        source_path: 'Slide_009.mp4',
        auto_advance_after_video: true
    },
    {
        id: 9,
        round_number: 1,
        title: "Year One Introduction",
        type: 'video',
        source_path: 'Slide_010.mp4',
        auto_advance_after_video: true
    },
    {
        id: 10,
        round_number: 1,
        title: "Production Line Problem",
        type: 'video',
        source_path: 'Slide_011.mp4',
        auto_advance_after_video: true
    },
    {
        id: 11,
        round_number: 1,
        title: "CH1: Machinery Failure Setup",
        type: 'video',
        source_path: 'Slide_012.mp4',
        auto_advance_after_video: true
    },
    {
        id: 12,
        round_number: 1,
        title: "CH1 Option A: CNC Machine",
        type: 'video',
        source_path: 'Slide_013.mp4',
        auto_advance_after_video: true
    },
    {
        id: 13,
        round_number: 1,
        title: "CH1 Option B: Replacement Equipment",
        type: 'video',
        source_path: 'Slide_014.mp4',
        auto_advance_after_video: true
    },
    {
        id: 14,
        round_number: 1,
        title: "CH1 Option C: Outsource",
        type: 'video',
        source_path: 'Slide_015.mp4',
        auto_advance_after_video: true
    },
    {
        id: 15,
        round_number: 1,
        title: "CH1 Option D: Do Nothing",
        type: 'video',
        source_path: 'Slide_016.mp4',
        auto_advance_after_video: true
    },
    {
        id: 16,
        round_number: 1,
        title: "Team Phone Guru Instructions",
        type: 'video',
        source_path: 'Slide_017.mp4',
        auto_advance_after_video: true
    },
    {
        id: 17,
        round_number: 1,
        title: "CH1 Decision Timer",
        type: 'interactive_choice',
        source_path: 'Slide_018.mp4',
        interactive_data_key: 'ch1',
        main_text: "CHALLENGE 1: Machinery Failure",
        sub_text: "How will you respond to the equipment failure?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        host_alert: {
            title: "CH1 Closed",
            message: "Challenge 1 decisions are in. Click OK for results."
        }
    },
    {
        id: 18,
        round_number: 1,
        title: "CH1 Results Collection",
        type: 'video',
        source_path: 'Slide_019.mp4',
        auto_advance_after_video: true
    },
    {
        id: 19,
        round_number: 1,
        title: "Consequences Introduction",
        type: 'video',
        source_path: 'Slide_020.mp4',
        auto_advance_after_video: true
    },
    {
        id: 20,
        round_number: 1,
        title: "CH1 Option A Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A: CNC Machine",
        sub_text: "The complex CNC machine takes longer than expected",
        details: ["-250 Capacity", "+$50k Costs", "Future customization capability"],
        source_path: 'Slide_021.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 21,
        round_number: 1,
        title: "CH1 Option B Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B: Replacement Equipment",
        sub_text: "Quick fix but missed opportunity",
        details: ["-250 Capacity", "+$50k Costs"],
        source_path: 'Slide_022.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 22,
        round_number: 1,
        title: "CH1 Option C Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C: Outsource",
        sub_text: "Flexible solution with quick recovery",
        details: ["+250 Capacity", "+$25k Costs"],
        source_path: 'Slide_023.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 23,
        round_number: 1,
        title: "CH1 Option D Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D: Do Nothing",
        sub_text: "Significant delays and production issues",
        details: ["-500 Capacity", "+$75k Costs", "-200 Orders"],
        source_path: 'Slide_024.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 24,
        round_number: 1,
        title: "CH1 Career Insight - CNC Operator",
        type: 'video',
        source_path: 'Slide_025.mp4',
        auto_advance_after_video: false
    },
    {
        id: 25,
        round_number: 1,
        title: "Transition to Next Challenge",
        type: 'video',
        source_path: 'Slide_026.mp4',
        auto_advance_after_video: true
    },
    {
        id: 26,
        round_number: 1,
        title: "KMEP Nightly News",
        type: 'video',
        source_path: 'Slide_027.mp4',
        auto_advance_after_video: true
    },
    {
        id: 27,
        round_number: 1,
        title: "CH2: New Tax Setup",
        type: 'video',
        source_path: 'Slide_028.mp4',
        auto_advance_after_video: true
    },
    {
        id: 28,
        round_number: 1,
        title: "CH2 Option A: Raise Prices",
        type: 'video',
        source_path: 'Slide_029.mp4',
        auto_advance_after_video: true
    },
    {
        id: 29,
        round_number: 1,
        title: "CH2 Option B: Increase Marketing",
        type: 'video',
        source_path: 'Slide_030.mp4',
        auto_advance_after_video: true
    },
    {
        id: 30,
        round_number: 1,
        title: "CH2 Option C: Cost Cutting",
        type: 'video',
        source_path: 'Slide_031.mp4',
        auto_advance_after_video: true
    },
    {
        id: 31,
        round_number: 1,
        title: "CH2 Option D: Do Nothing",
        type: 'video',
        source_path: 'Slide_032.mp4',
        auto_advance_after_video: true
    },
    {
        id: 32,
        round_number: 1,
        title: "CH2 Decision Timer",
        type: 'interactive_choice',
        source_path: 'Slide_033.mp4',
        interactive_data_key: 'ch2',
        main_text: "CHALLENGE 2: Corporate Activities Tax",
        sub_text: "How will you respond to the new tax?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        host_alert: {
            title: "CH2 Closed",
            message: "Challenge 2 decisions are in. Click OK for results."
        }
    },
    {
        id: 33,
        round_number: 1,
        title: "CH2 Results Collection",
        type: 'video',
        source_path: 'Slide_034.mp4',
        auto_advance_after_video: true
    },
    {
        id: 34,
        round_number: 1,
        title: "CH2 Consequences Introduction",
        type: 'video',
        source_path: 'Slide_035.mp4',
        auto_advance_after_video: true
    },
    {
        id: 35,
        round_number: 1,
        title: "CH2 Option A Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A: Raise Prices",
        sub_text: "$1000+ price point not a barrier",
        details: ["+$20 ASP"],
        source_path: 'Slide_036.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 36,
        round_number: 1,
        title: "CH2 Option B Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B: Increase Marketing",
        sub_text: "Marketing efforts pay off",
        details: ["+500 Orders", "+$25k Costs"],
        source_path: 'Slide_037.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 37,
        round_number: 1,
        title: "CH2 Option C Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C: Cost Cutting",
        sub_text: "Cost cutting backfires - morale issues",
        details: ["-250 Capacity", "-$25k Costs"],
        source_path: 'Slide_038.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 38,
        round_number: 1,
        title: "CH2 Option D Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D: Do Nothing",
        sub_text: "Tax will impact profits",
        details: ["Tax decreases profits at end of round"],
        source_path: 'Slide_039.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 39,
        round_number: 1,
        title: "CH2 Career Insight - Finance",
        type: 'video',
        source_path: 'Slide_040.mp4',
        auto_advance_after_video: true,
    },
    {
        id: 40,
        round_number: 1,
        title: "Year 2 Introduction",
        type: 'video',
        source_path: 'Slide_041.mp4',
        auto_advance_after_video: true
    },
    {
        id: 41,
        round_number: 1,
        title: "Year 2 News - Recession",
        type: 'video',
        source_path: 'Slide_042.mp4',
        auto_advance_after_video: true
    },
    {
        id: 42,
        round_number: 1,
        title: "CH3: Recession Setup",
        type: 'video',
        source_path: 'Slide_043.mp4',
        auto_advance_after_video: true
    },
    {
        id: 43,
        round_number: 1,
        title: "CH3 Option A: Layoffs",
        type: 'video',
        source_path: 'Slide_044.mp4',
        auto_advance_after_video: true
    },
    {
        id: 44,
        round_number: 1,
        title: "CH3 Option B: Furlough/Workshare",
        type: 'video',
        source_path: 'Slide_045.mp4',
        auto_advance_after_video: true
    },
    {
        id: 45,
        round_number: 1,
        title: "CH3 Option C: Cut OT/Temps",
        type: 'video',
        source_path: 'Slide_046.mp4',
        auto_advance_after_video: true
    },
    {
        id: 46,
        round_number: 1,
        title: "CH3 Option D: Do Nothing",
        type: 'video',
        source_path: 'Slide_047.mp4',
        auto_advance_after_video: true
    },
    {
        id: 47,
        round_number: 1,
        title: "CH3 Decision Timer",
        type: 'interactive_choice',
        source_path: 'Slide_048.mp4',
        interactive_data_key: 'ch3',
        main_text: "CHALLENGE 3: Recession Response",
        sub_text: "How will you handle the economic downturn?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        host_alert: {
            title: "CH3 Closed",
            message: "Challenge 3 decisions are in. Click OK for results."
        }
    },
    {
        id: 48,
        round_number: 1,
        title: "CH3 Results Collection",
        type: 'video',
        source_path: 'Slide_049.mp4',
        auto_advance_after_video: true
    },
    {
        id: 49,
        round_number: 1,
        title: "CH3 Consequences Introduction",
        type: 'video',
        source_path: 'Slide_050.mp4',
        auto_advance_after_video: true
    },
    {
        id: 50,
        round_number: 1,
        title: "CH3 Option A Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A: Layoffs",
        sub_text: "Major workforce reduction with permanent impact",
        details: ["-1250 Capacity", "-$300k Costs", "Permanent KPI Impact Card"],
        source_path: 'Slide_051.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 51,
        round_number: 1,
        title: "CH3 Option B Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B: Furlough/Workshare",
        sub_text: "Temporary workforce reduction",
        details: ["-1000 Capacity", "-$200k Costs"],
        source_path: 'Slide_052.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 52,
        round_number: 1,
        title: "CH3 Option C Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C: Cut OT/Temps",
        sub_text: "Moderate adjustment to workforce",
        details: ["-500 Capacity", "-$100k Costs"],
        source_path: 'Slide_053.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 53,
        round_number: 1,
        title: "CH3 Option D Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D: Do Nothing",
        sub_text: "Cash flow crisis leads to multiple problems",
        details: ["-1000 Capacity", "-1000 Orders"],
        source_path: 'Slide_054.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 54,
        round_number: 1,
        title: "CH3 Career Insight - HR Manager",
        type: 'video',
        source_path: 'Slide_055.mp4',
        auto_advance_after_video: false
    },
    {
        id: 55,
        round_number: 1,
        title: "Investment Payoffs Introduction",
        type: 'video',
        source_path: 'Slide_056.mp4',
        auto_advance_after_video: true
    },
    {
        id: 56,
        round_number: 1,
        title: "Payoff: #1 Business Growth Strategy",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Business Growth Strategy",
        sub_text: "Strategic insights pay off",
        details: ["+250 Capacity", "+250 Orders", "+$20 ASP"],
        source_path: 'Slide_057.mp4'
    },
    {
        id: 57,
        round_number: 1,
        title: "Payoff: #2 Production Efficiency",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Production Efficiency",
        sub_text: "Major capacity increase",
        details: ["+1500 Capacity"],
        source_path: 'Slide_058.mp4'
    },
    {
        id: 58,
        round_number: 1,
        title: "Payoff: #3 Add 2nd Shift",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Add 2nd Shift",
        sub_text: "Capacity boost with added labor costs",
        details: ["+1500 Capacity", "+$300k Costs"],
        source_path: 'Slide_059.mp4'
    },
    {
        id: 59,
        round_number: 1,
        title: "Payoff: #4 Supply Chain Optimization",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Supply Chain Optimization",
        sub_text: "Efficiency gains and cost reduction",
        details: ["+250 Capacity", "-$100k Costs"],
        source_path: 'Slide_060.mp4'
    },
    {
        id: 60,
        round_number: 1,
        title: "Payoff: #5 Employee Development",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Employee Development",
        sub_text: "Training boosts efficiency and cuts waste",
        details: ["+250 Capacity", "-$25k Costs"],
        source_path: 'Slide_061.mp4',
    },
    {
        id: 61,
        round_number: 1,
        title: "Payoff: #6 Maximize Sales (Boutique)",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Maximize Sales (Boutique)",
        sub_text: "Direct-to-consumer sales boom",
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
        type: 'video',
        source_path: 'Slide_063.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "End of Round 1",
            message: "CFOs should write KPIs from board on team summary sheets. Collect sheets before proceeding."
        }
    },
    {
        id: 63,
        round_number: 1,
        title: "RD-1 Leaderboard",
        type: 'video',
        source_path: 'Slide_064.mp4',
        auto_advance_after_video: false,
    },
    {
        id: 63.1,
        round_number: 1,
        title: "RD-1 Leaderboard: Capacity & Orders",
        type: 'leaderboard_chart',
        main_text: "Round 1 Leaderboard: Capacity & Orders",
        sub_text: "Comparison of production capability and market demand."
    },
    {
        id: 63.2,
        round_number: 1,
        title: "RD-1 Leaderboard: Cost Per Board",
        type: 'leaderboard_chart',
        main_text: "Round 1 Leaderboard: Cost Per Board",
        sub_text: "Efficiency comparison among teams."
    },
    {
        id: 63.3,
        round_number: 1,
        title: "RD-1 Leaderboard: Total Costs",
        type: 'leaderboard_chart',
        main_text: "Round 1 Leaderboard: Total Operational Costs",
        sub_text: "Overall spending by each team."
    },
    {
        id: 63.4,
        round_number: 1,
        title: "RD-1 Leaderboard: ASP",
        type: 'leaderboard_chart',
        main_text: "Round 1 Leaderboard: Average Selling Price",
        sub_text: "Pricing strategy comparison."
    },
    {
        id: 63.5,
        round_number: 1,
        title: "RD-1 Leaderboard: Revenue",
        type: 'leaderboard_chart',
        main_text: "Round 1 Leaderboard: Total Revenue",
        sub_text: "Revenue generation comparison."
    },
    {
        id: 63.6,
        round_number: 1,
        title: "RD-1 Leaderboard: Net Margin",
        type: 'leaderboard_chart',
        main_text: "Round 1 Leaderboard: Net Profit Margin",
        sub_text: "Profitability percentage comparison."
    },
    {
        id: 63.7,
        round_number: 1,
        title: "RD-1 Leaderboard: Net Income",
        type: 'leaderboard_chart',
        main_text: "Round 1 Leaderboard: Net Income",
        sub_text: "Overall profitability ranking after Round 1."
    },

    // --- Round 2 Transition (but still showing Round 1 KPIs) ---
    {
        id: 64,
        round_number: 1,  // ✅ CHANGED: Keep showing Round 1 KPIs
        title: "Heading to Round 2",
        type: 'video',
        source_path: 'Slide_065.mp4',
        auto_advance_after_video: true
    },
    {
        id: 65,
        round_number: 1,  // ✅ CHANGED: Keep showing Round 1 KPIs
        title: "Round Progress Reminder",
        type: 'video',
        source_path: 'Slide_066.mp4',
        auto_advance_after_video: true
    },
    {
        id: 66,
        round_number: 1,  // ✅ CHANGED: Keep showing Round 1 KPIs
        title: "RD-2 KPI Reset Explanation",
        type: 'video',
        source_path: 'Slide_067.mp4',
        auto_advance_after_video: true
    },
    {
        id: 67,
        round_number: 2,  // ✅ CORRECT: This is where Round 2 actually starts
        title: "KPI Reset Example",
        type: 'kpi_reset',
        source_path: 'Slide_068.mp4',
        auto_advance_after_video: true
    },
    {
        id: 68,
        round_number: 2,  // ✅ CORRECT: Now showing Round 2 KPIs
        title: "RD-2 Starting KPIs",
        type: 'video',
        source_path: 'Slide_069.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "Reset KPIs",
            message: "Ensure all teams have reset their KPIs to starting values before proceeding."
        }
    },
    {
        id: 69,
        round_number: 2,
        title: "RD-2 Investment Period Intro",
        type: 'video',
        source_path: 'Slide_070.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "Hand Out RD-2 Materials",
            message: "Distribute RD-2 Investment Cards and Position Updates to all teams."
        }
    },
    {
        id: 70,
        round_number: 2,
        title: "RD-2 Investment Decision Period",
        type: 'interactive_invest',
        source_path: 'Slide_071.mp4',
        interactive_data_key: 'rd2-invest',
        main_text: "RD-2 INVEST: TIMER ACTIVE",
        sub_text: "You have $500K to invest. Submit decisions before time expires.",
        auto_advance_after_video: false,
        background_css: 'bg-slate-800',
        host_alert: {
            title: "Investment Period Complete",
            message: "Confirm all teams have submitted their RD-2 investments."
        }
    },
    {
        id: 71,
        round_number: 2,
        title: "Team Summary Sheets RD-2",
        type: 'video',
        source_path: 'Slide_072.mp4',
        auto_advance_after_video: false
    },
    {
        id: 72,
        round_number: 2,
        title: "Year 3 Introduction",
        type: 'video',
        source_path: 'Slide_073.mp4',
        auto_advance_after_video: true
    },
    {
        id: 73,
        round_number: 2,
        title: "CH4: News - Supply Chain Crisis",
        type: 'video',
        source_path: 'Slide_074.mp4',
        auto_advance_after_video: true
    },
    {
        id: 74,
        round_number: 2,
        title: "CH4: Supply Crisis Details",
        type: 'video',
        source_path: 'Slide_075.mp4',
        auto_advance_after_video: true
    },
    {
        id: 75,
        round_number: 2,
        title: "CH4: Option A",
        type: 'video',
        source_path: 'Slide_076.mp4',
        auto_advance_after_video: true
    },
    {
        id: 76,
        round_number: 2,
        title: "CH4: Option B",
        type: 'video',
        source_path: 'Slide_077.mp4',
        auto_advance_after_video: true
    },
    {
        id: 77,
        round_number: 2,
        title: "CH4: Option C",
        type: 'video',
        source_path: 'Slide_078.mp4',
        auto_advance_after_video: true
    },
    {
        id: 78,
        round_number: 2,
        title: "CH4: Decision Timer",
        type: 'interactive_choice',
        source_path: 'Slide_079.mp4',
        interactive_data_key: 'ch4',
        main_text: "CHALLENGE 4: Supply Chain Crisis",
        sub_text: "How will you handle the supply chain disruption?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        host_alert: {
            title: "CH4 Closed",
            message: "Challenge 4 decisions are in. Click OK for results."
        }
    },
    {
        id: 79,
        round_number: 2,
        title: "CH4 Results",
        type: 'video',
        source_path: 'Slide_080.mp4',
        auto_advance_after_video: true
    },
    {
        id: 80,
        round_number: 2,
        title: "CH4 Consequences Intro",
        type: 'video',
        source_path: 'Slide_081.mp4',
        auto_advance_after_video: true
    },
    {
        id: 81,
        round_number: 2,
        title: "CH4 Immunity Check",
        type: 'video',
        source_path: 'Slide_082.mp4',
        auto_advance_after_video: true
    },
    {
        id: 82,
        round_number: 2,
        title: "CH4 Option A Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A",
        sub_text: "New suppliers cause production issues",
        details: ["-250 Capacity", "+$50k Costs"],
        source_path: 'Slide_083.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 83,
        round_number: 2,
        title: "CH4 Option B Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B",
        sub_text: "Renegotiation helps, but costs still increase",
        details: ["+$50k Costs"],
        source_path: 'Slide_084.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 84,
        round_number: 2,
        title: "CH4 Option C Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C",
        sub_text: "Delays disrupt manufacturing",
        details: ["-500 Capacity", "+$75k Costs"],
        source_path: 'Slide_085.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 85,
        round_number: 2,
        title: "CH4 Career Insight",
        type: 'video',
        source_path: 'Slide_086.mp4',
        auto_advance_after_video: false
    },
    {
        id: 86,
        round_number: 2,
        title: "CH5: Capacity Crisis Intro",
        type: 'consequence_reveal',
        source_path: 'Slide_087.mp4',
        auto_advance_after_video: true
    },
    {
        id: 87,
        round_number: 2,
        title: "CH5: Option A",
        type: 'video',
        source_path: 'Slide_088.mp4',
        auto_advance_after_video: true
    },
    {
        id: 88,
        round_number: 2,
        title: "CH5: Option B",
        type: 'video',
        source_path: 'Slide_089.mp4',
        auto_advance_after_video: true
    },
    {
        id: 89,
        round_number: 2,
        title: "CH5: Option C",
        type: 'video',
        source_path: 'Slide_090.mp4',
        auto_advance_after_video: true
    },
    {
        id: 90,
        round_number: 2,
        title: "CH5: Option D",
        type: 'video',
        source_path: 'Slide_091.mp4',
        auto_advance_after_video: true
    },
    {
        id: 91,
        round_number: 2,
        title: "CH5 Decision Timer",
        type: 'interactive_choice',
        source_path: 'Slide_092.mp4',
        interactive_data_key: 'ch5',
        main_text: "CHALLENGE 5: Capacity Crisis",
        sub_text: "How will you meet the increased demand?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        host_alert: {
            title: "CH5 Closed",
            message: "Challenge 5 decisions are in. Click OK for results."
        }
    },
    {
        id: 92,
        round_number: 2,
        title: "CH5 Results",
        type: 'video',
        source_path: 'Slide_093.mp4',
        auto_advance_after_video: true
    },
    {
        id: 93,
        round_number: 2,
        title: "CH5: Option A Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A: Hire Staff",
        sub_text: "New hires increase capacity and costs",
        details: ["+1000 Capacity", "+$400k Costs", "Bonus: +500 Cap if invested in Employee Dev"],
        source_path: 'Slide_094.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 94,
        round_number: 2,
        title: "CH5: Option B Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B: Hire Temps",
        sub_text: "Temps are effective but costly short-term solution",
        details: ["+1000 Capacity", "+$200k Costs", "Bonus: +500 Cap if invested in Employee Dev"],
        source_path: 'Slide_095.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 95,
        round_number: 2,
        title: "CH5: Option C Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C: Raise Prices",
        sub_text: "Price increase impacts some orders",
        details: ["+$50 ASP", "-250 Orders"],
        source_path: 'Slide_096.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 96,
        round_number: 2,
        title: "CH5: Option D Consequences",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D: Do Nothing",
        sub_text: "No changes to KPIs",
        details: ["No impact to KPIs"],
        source_path: 'Slide_097.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 97,
        round_number: 2,
        title: "CH5 Career Insight",
        type: 'video',
        source_path: 'Slide_098.mp4',
        auto_advance_after_video: false
    },
    {
        id: 98,
        round_number: 2,
        title: "Year 4 Introduction",
        type: 'video',
        source_path: 'Slide_099.mp4',
        auto_advance_after_video: true
    },
    {
        id: 99,
        round_number: 2,
        title: "CH6: News - Quality Crisis",
        type: 'video',
        source_path: 'Slide_100.mp4',
        auto_advance_after_video: true
    },
    {
        id: 100,
        round_number: 2,
        title: "CH6: Quality Crisis Setup",
        type: 'consequence_reveal',
        source_path: 'Slide_101.mp4',
        auto_advance_after_video: true
    },
    {
        id: 101,
        round_number: 2,
        title: "CH6: Option A",
        type: 'video',
        source_path: 'Slide_102.mp4',
        auto_advance_after_video: true
    },
    {
        id: 102,
        round_number: 2,
        title: "CH6: Option B",
        type: 'video',
        source_path: 'Slide_103.mp4',
        auto_advance_after_video: true
    },
    {
        id: 103,
        round_number: 2,
        title: "CH6: Option C",
        type: 'video',
        source_path: 'Slide_104.mp4',
        auto_advance_after_video: true
    },
    {
        id: 104,
        round_number: 2,
        title: "CH6: Option D",
        type: 'video',
        source_path: 'Slide_105.mp4',
        auto_advance_after_video: true
    },
    {
        id: 105,
        round_number: 2,
        title: "CH6: Decision Timer",
        type: 'interactive_choice',
        source_path: 'Slide_106.mp4',
        interactive_data_key: 'ch6',
        main_text: "CHALLENGE 6: Quality Crisis",
        sub_text: "How will you handle the defective products?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        host_alert: {
            title: "CH6 Closed",
            message: "Challenge 6 decisions are in. Click OK for results."
        }
    },
    {
        id: 106,
        round_number: 2,
        title: "CH6 Results",
        type: 'video',
        source_path: 'Slide_107.mp4',
        auto_advance_after_video: true
    },
    {
        id: 107,
        round_number: 2,
        title: "CH6 Immunity Check",
        type: 'video',
        source_path: 'Slide_108.mp4',
        auto_advance_after_video: true
    },
    {
        id: 108,
        round_number: 2,
        title: "CH6: Option A Consequences",
        type: 'consequence_reveal',
        main_text: "Option A: Hire QC Expert",
        sub_text: "Reactive hire is costly and slow",
        details: ["-250 Capacity", "-250 Orders", "+$100k Costs", "-$30 ASP"],
        source_path: 'Slide_109.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 109,
        round_number: 2,
        title: "CH6: Option B Consequences",
        type: 'consequence_reveal',
        main_text: "Option B: Engage PR",
        sub_text: "Problem continues, brand damage worsens",
        details: ["-250 Capacity", "-500 Orders", "+$150k Costs", "-$30 ASP"],
        source_path: 'Slide_110.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 110,
        round_number: 2,
        title: "CH6: Option C Consequences",
        type: 'consequence_reveal',
        main_text: "Option C: Do Both",
        sub_text: "Effective but expensive solution",
        details: ["-250 Capacity", "+250 Orders", "+$125k Costs"],
        source_path: 'Slide_111.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 111,
        round_number: 2,
        title: "CH6: Option D Consequences",
        type: 'consequence_reveal',
        main_text: "Option D: Do Nothing",
        sub_text: "Brand reputation is severely damaged",
        details: ["-250 Capacity", "-750 Orders", "+$75k Costs", "-$50 ASP"],
        source_path: 'Slide_112.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 112,
        round_number: 2,
        title: "CH6 Career Insight",
        type: 'video',
        source_path: 'Slide_113.mp4',
        auto_advance_after_video: false
    },
    {
        id: 113,
        round_number: 2,
        title: "CH7: Competition Challenge Setup",
        type: 'video',
        source_path: 'Slide_114.mp4',
        auto_advance_after_video: true
    },
    {
        id: 114,
        round_number: 2,
        title: "CH7: Option A",
        type: 'video',
        source_path: 'Slide_115.mp4',
        auto_advance_after_video: true
    },
    {
        id: 115,
        round_number: 2,
        title: "CH7: Option B",
        type: 'video',
        source_path: 'Slide_116.mp4',
        auto_advance_after_video: true
    },
    {
        id: 116,
        round_number: 2,
        title: "CH7: Option C",
        type: 'video',
        source_path: 'Slide_117.mp4',
        auto_advance_after_video: true
    },
    {
        id: 117,
        round_number: 2,
        title: "CH7: Option D",
        type: 'video',
        source_path: 'Slide_118.mp4',
        auto_advance_after_video: true
    },
    {
        id: 118,
        round_number: 2,
        title: "CH7: Decision Timer",
        type: 'interactive_choice',
        source_path: 'Slide_119.mp4',
        interactive_data_key: 'ch7',
        main_text: "CHALLENGE 7: Competition from Karit Co.",
        sub_text: "How will you respond to the new competitor?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        host_alert: {
            title: "CH7 Closed",
            message: "Challenge 7 decisions are in. Click OK for results."
        }
    },
    {
        id: 119,
        round_number: 2,
        title: "CH7 Results",
        type: 'video',
        source_path: 'Slide_120.mp4',
        auto_advance_after_video: true
    },
    {
        id: 120,
        round_number: 2,
        title: "CH7: Option A Consequences",
        type: 'consequence_reveal',
        main_text: "Option A: Drop Prices",
        sub_text: "Helps protect some orders but hurts margins",
        details: ["-250 Orders", "-$20 ASP"],
        source_path: 'Slide_121.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 121,
        round_number: 2,
        title: "CH7: Option B Consequences",
        type: 'consequence_reveal',
        main_text: "Option B: Increase Marketing",
        sub_text: "Maintains some orders but increases costs",
        details: ["-250 Orders", "+$25k Costs"],
        source_path: 'Slide_122.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 122,
        round_number: 2,
        title: "CH7: Option C Consequences",
        type: 'consequence_reveal',
        main_text: "Option C: Add Customization",
        sub_text: "Adds value but slows production",
        details: ["-500 Capacity", "+$25k Costs", "+$10 ASP"],
        source_path: 'Slide_123.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 123,
        round_number: 2,
        title: "CH7: Option D Consequences",
        type: 'consequence_reveal',
        main_text: "Option D: Do Nothing",
        sub_text: "Demand takes a big hit",
        details: ["-500 Orders"],
        source_path: 'Slide_124.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 124,
        round_number: 2,
        title: "CH7 Career Insight",
        type: 'video',
        source_path: 'Slide_125.mp4',
        auto_advance_after_video: false
    },
    {
        id: 125,
        round_number: 2,
        title: "RD-2 Investment Payoffs Intro",
        type: 'video',
        source_path: 'Slide_126.mp4',
        auto_advance_after_video: true
    },
    {
        id: 126,
        round_number: 2,
        title: "Payoff: #1 Business Growth",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: Business Growth Strategy",
        sub_text: "Impact: +250 Capacity, +250 Orders, +$20 ASP",
        details: ["+250 Capacity", "+250 Orders", "+$20 ASP"],
        source_path: 'Slide_127.mp4'
    },
    {
        id: 127,
        round_number: 2,
        title: "Payoff: #2 Production Efficiency",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: Production Efficiency",
        sub_text: "Impact: +2000 Capacity, +$50k Costs",
        details: ["+2000 Capacity", "+$50k Costs"],
        source_path: 'Slide_128.mp4'
    },
    {
        id: 128,
        round_number: 2,
        title: "Payoff: #3 2nd Shift Expansion",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: 2nd Shift Expansion",
        sub_text: "Impact: +3000 Capacity, +$575k Costs",
        details: ["+3000 Capacity", "+$575k Costs"],
        source_path: 'Slide_129.mp4'
    },
    {
        id: 129,
        round_number: 2,
        title: "Payoff: #4 Supply Chain",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: Supply Chain Optimization",
        sub_text: "Impact: +500 Capacity, -$200k Costs",
        details: ["+500 Capacity", "-$200k Costs"],
        source_path: 'Slide_130.mp4'
    },
    {
        id: 130,
        round_number: 2,
        title: "Payoff: #5 Employee Development",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: Employee Development",
        sub_text: "Impact: +500 Capacity, -$25k Costs",
        details: ["+500 Capacity", "-$25k Costs"],
        source_path: 'Slide_131.mp4'
    },
    {
        id: 131,
        round_number: 2,
        title: "Payoff: #6 Maximize Boutique",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: Maximize Boutique Sales",
        sub_text: "Impact: +2000 Orders, +$40 ASP",
        details: ["+2000 Orders", "+$40 ASP"],
        source_path: 'Slide_132.mp4'
    },
    {
        id: 132,
        round_number: 2,
        title: "Payoff: #7 Big Box Expansion",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: Big Box Expansion",
        sub_text: "Impact: +1500 Orders, +$50k Costs",
        details: ["+1500 Orders", "+$50k Costs"],
        source_path: 'Slide_133.mp4'
    },
    {
        id: 133,
        round_number: 2,
        title: "Payoff: #8 ERP",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: Enterprise Resource Planning",
        sub_text: "Impact: +250 Capacity, +250 Orders, +$25k Costs, +$10 ASP",
        details: ["+250 Capacity", "+250 Orders", "+$25k Costs", "+$10 ASP"],
        source_path: 'Slide_134.mp4'
    },
    {
        id: 134,
        round_number: 2,
        title: "Payoff: #9 IT Security",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: IT & Cyber Security",
        sub_text: "No immediate impact",
        details: ["No KPI changes this round"],
        source_path: 'Slide_135.mp4'
    },
    {
        id: 135,
        round_number: 2,
        title: "Payoff: #10 Product Line",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: Product Line Expansion",
        sub_text: "Impact: +1000 Capacity, +1000 Orders, +$50k Costs, -$20 ASP",
        details: ["+1000 Capacity", "+1000 Orders", "+$50k Costs", "-$20 ASP"],
        source_path: 'Slide_136.mp4'
    },
    {
        id: 136,
        round_number: 2,
        title: "Payoff: #11 Automation",
        type: 'payoff_reveal',
        main_text: "RD-2 Payoff: Automation & Co-bots",
        sub_text: "Impact: +1500 Capacity, +$150k Costs",
        details: ["+1500 Capacity", "+$150k Costs"],
        source_path: 'Slide_137.mp4'
    },
    {
        id: 137,
        round_number: 2,
        title: "Bonus: Production Efficiency Synergy",
        type: 'payoff_reveal',
        main_text: "RD-2 Bonus: Production Efficiency Synergy",
        sub_text: "Integration bonus for combined manufacturing investments",
        details: ["Conditional bonuses for Production Efficiency + manufacturing"],
        source_path: 'Slide_138.mp4'
    },
    {
        id: 138,
        round_number: 2,
        title: "Bonus: Supply Chain Distribution Synergy",
        type: 'payoff_reveal',
        main_text: "RD-2 Bonus: Supply Chain + Distribution Synergy",
        sub_text: "Enhanced efficiency from integrated logistics and sales",
        details: ["Conditional bonus: +1000 Orders, -$50K Costs"],
        source_path: 'Slide_139.mp4'
    },
    {
        id: 139,
        round_number: 2,
        title: "End of Round 2 KPIs",
        type: 'video',
        source_path: 'Slide_140.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "End of Round 2",
            message: "CFOs should write KPIs from board on team summary sheets."
        }
    },
    {
        id: 140,
        round_number: 2,
        title: "RD-2 Leaderboard",
        type: 'video',
        source_path: 'Slide_141.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "Show Leaderboard",
            message: "Display the Round 2 leaderboard to teams."
        }
    },
    {
        id: 140.1,
        round_number: 2,
        title: "RD-2 Leaderboard: Capacity & Orders",
        type: 'leaderboard_chart',
        main_text: "Round 2 Leaderboard: Capacity & Orders",
        sub_text: "Production capability and market demand after Round 2."
    },
    {
        id: 140.2,
        round_number: 2,
        title: "RD-2 Leaderboard: Cost Per Board",
        type: 'leaderboard_chart',
        main_text: "Round 2 Leaderboard: Cost Per Board",
        sub_text: "Efficiency comparison after Round 2."
    },
    {
        id: 140.3,
        round_number: 2,
        title: "RD-2 Leaderboard: Total Costs",
        type: 'leaderboard_chart',
        main_text: "Round 2 Leaderboard: Total Operational Costs",
        sub_text: "Overall spending by each team in Round 2."
    },
    {
        id: 140.4,
        round_number: 2,
        title: "RD-2 Leaderboard: ASP",
        type: 'leaderboard_chart',
        main_text: "Round 2 Leaderboard: Average Selling Price",
        sub_text: "Pricing strategy results after Round 2."
    },
    {
        id: 140.5,
        round_number: 2,
        title: "RD-2 Leaderboard: Revenue",
        type: 'leaderboard_chart',
        main_text: "Round 2 Leaderboard: Total Revenue",
        sub_text: "Revenue generation comparison after Round 2."
    },
    {
        id: 140.6,
        round_number: 2,
        title: "RD-2 Leaderboard: Net Margin",
        type: 'leaderboard_chart',
        main_text: "Round 2 Leaderboard: Net Profit Margin",
        sub_text: "Profitability percentage after Round 2."
    },
    {
        id: 140.7,
        round_number: 2,
        title: "RD-2 Leaderboard: Cumulative Net Income",
        type: 'leaderboard_chart',
        main_text: "Round 2 Leaderboard: Cumulative Net Income",
        sub_text: "Total profitability ranking after Rounds 1 & 2."
    },

    // --- Round 3 Transition (but still showing Round 2 KPIs) ---
    {
        id: 141,
        round_number: 2,  // ✅ CHANGED: Keep showing Round 2 KPIs
        title: "Welcome to Round 3",
        type: 'video',
        source_path: 'Slide_142.mp4',
        auto_advance_after_video: true
    },
    {
        id: 142,
        round_number: 3,  // ✅ CORRECT: This is where Round 3 actually starts
        title: "RD-3 KPI Reset",
        type: 'kpi_reset',
        source_path: 'Slide_143.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "Reset KPIs for Round 3",
            message: "Ensure all teams reset to: Cap: 5000, Orders: 7250, Costs: $1.35M, ASP: $1000"
        }
    },
    {
        id: 143,
        round_number: 3,
        title: "RD-3 Investment Period",
        type: 'interactive_invest',
        source_path: 'Slide_144.mp4',
        interactive_data_key: 'rd3-invest',
        main_text: "RD-3 INVEST: $600K Budget",
        sub_text: "Final investment round. Some options require RD-2 prerequisites.",
        auto_advance_after_video: false,
        background_css: 'bg-slate-800',
        host_alert: {
            title: "Hand Out RD-3 Materials",
            message: "Distribute RD-3 Investment Cards. Note: No position updates this round."
        }
    },
    {
        id: 144,
        round_number: 3,
        title: "Double Down Decision",
        type: 'interactive_double_down_select',
        interactive_data_key: 'ch-dd-prompt',
        source_path: 'Slide_145.mp4',
        main_text: "DOUBLE DOWN OPPORTUNITY",
        sub_text: "Teams have 5 minutes to decide on their Double Down strategy",
        timer_duration_seconds: 300,
        auto_advance_after_video: false,
        background_css: 'bg-slate-800',
        host_alert: {
            title: "Double Down Decision",
            message: "Teams have 5 minutes to decide on their Double Down strategy. This is their only chance."
        }
    },
    {
        id: 145,
        round_number: 3,
        title: "Year 5 Introduction",
        type: 'video',
        source_path: 'Slide_146.mp4',
        auto_advance_after_video: true
    },
    {
        id: 146,
        round_number: 3,
        title: "CH8: News - Cyber Attack",
        type: 'video',
        source_path: 'Slide_147.mp4',
        auto_advance_after_video: true
    },
    {
        id: 147,
        round_number: 3,
        title: "CH8: Cyber Attack Setup",
        type: 'video',
        source_path: 'Slide_148.mp4',
        auto_advance_after_video: true
    },
    {
        id: 148,
        round_number: 3,
        title: "CH8: Option A",
        type: 'video',
        source_path: 'Slide_149.mp4',
        auto_advance_after_video: true
    },
    {
        id: 149,
        round_number: 3,
        title: "CH8: Option B",
        type: 'video',
        source_path: 'Slide_150.mp4',
        auto_advance_after_video: true
    },
    {
        id: 150,
        round_number: 3,
        title: "CH8: Option C",
        type: 'video',
        source_path: 'Slide_151.mp4',
        auto_advance_after_video: true
    },
    {
        id: 151,
        round_number: 3,
        title: "CH8: Decision Timer",
        type: 'interactive_choice',
        source_path: 'Slide_152.mp4',
        interactive_data_key: 'ch8',
        main_text: "CHALLENGE 8: Cyber Attack",
        sub_text: "How will you respond to the ransomware attack?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        host_alert: {
            title: "CH8 Closed",
            message: "Challenge 8 decisions are in. Click OK for results."
        }
    },
    {
        id: 152,
        round_number: 3,
        title: "CH8 Results & Consequences Intro",
        type: 'video',
        source_path: 'Slide_153.mp4',
        auto_advance_after_video: true
    },
    {
        id: 153,
        round_number: 3,
        title: "CH8 Immunity Check",
        type: 'video',
        source_path: 'Slide_154.mp4',
        auto_advance_after_video: true
    },
    {
        id: 154,
        round_number: 3,
        title: "CH8: Option A Consequences",
        type: 'consequence_reveal',
        main_text: "Option A: Pay, Don't Inform",
        sub_text: "Systems restored, but you dodged a bullet...",
        details: ["-250 Capacity", "+$100k Costs", "+1M SHAME"],
        source_path: 'Slide_155.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 155,
        round_number: 3,
        title: "CH8: Option B Consequences",
        type: 'consequence_reveal',
        main_text: "Option B: Pay & Inform",
        sub_text: "Customers appreciate honesty, systems restored",
        details: ["-250 Capacity", "+$100k Costs"],
        source_path: 'Slide_156.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 156,
        round_number: 3,
        title: "CH8 Option C Consequences",
        type: 'consequence_reveal',
        main_text: "Option C: Don't Pay, Rebuild",
        sub_text: "Rebuilding is slow and customers are furious",
        details: ["-500 Capacity", "-500 Orders", "+$75k Costs"],
        source_path: 'Slide_157.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 157,
        round_number: 3,
        title: "Cyber Attack Insights",
        type: 'video',
        source_path: 'Slide_158.mp4',
        auto_advance_after_video: true
    },
    {
        id: 158,
        round_number: 3,
        title: "CH8 Career Insight - IT Manager",
        type: 'video',
        source_path: 'Slide_159.mp4',
        auto_advance_after_video: false
    },
    {
        id: 159,
        round_number: 3,
        title: "Narrative Voicemail",
        type: 'video',
        source_path: 'Slide_160.mp4',
        auto_advance_after_video: true,
    },
    {
        id: 160,
        round_number: 3,
        title: "CH9: ERP Constraint Setup",
        type: 'video',
        source_path: 'Slide_161.mp4',
        auto_advance_after_video: true
    },
    {
        id: 161,
        round_number: 3,
        title: "CH9 Option A: Hire ERP Consultant",
        type: 'video',
        source_path: 'Slide_162.mp4',
        auto_advance_after_video: true
    },
    {
        id: 162,
        round_number: 3,
        title: "CH9 Option B: Rely on Spreadsheets",
        type: 'video',
        source_path: 'Slide_163.mp4',
        auto_advance_after_video: true
    },
    {
        id: 163,
        round_number: 3,
        title: "CH9 Option C: ERP Immunity",
        type: 'video',
        source_path: 'Slide_164.mp4',
        auto_advance_after_video: true
    },
    {
        id: 164,
        round_number: 3,
        title: "CH9 Decision Timer",
        type: 'interactive_choice',
        source_path: 'Slide_165.mp4',
        interactive_data_key: 'ch9',
        main_text: "CHALLENGE 9: ERP System Constraint",
        sub_text: "How will you handle the system failures?",
        timer_duration_seconds: 180,
        background_css: 'bg-purple-900',
        host_alert: {
            title: "CH9 Closed",
            message: "Challenge 9 decisions are in. Click OK for results."
        }
    },
    {
        id: 165,
        round_number: 3,
        title: "CH9 Results Collection",
        type: 'video',
        source_path: 'Slide_166.mp4',
        auto_advance_after_video: true
    },
    {
        id: 166,
        round_number: 3,
        title: "CH9 Option A Consequences",
        type: 'consequence_reveal',
        main_text: "Option A: Emergency ERP Implementation",
        sub_text: "Rushed implementation costs orders & capacity",
        details: ["-250 Capacity", "+$150k Costs"],
        source_path: 'Slide_167.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 167,
        round_number: 3,
        title: "CH9 Option B Consequences",
        type: 'consequence_reveal',
        main_text: "Option B: Rely on Spreadsheets",
        sub_text: "Firefighting is expensive and you lose orders",
        details: ["-1000 Orders", "+$50k Costs"],
        source_path: 'Slide_168.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 168,
        round_number: 3,
        title: "CH9 Option C Consequences",
        type: 'consequence_reveal',
        main_text: "Option C: ERP Investment Immunity",
        sub_text: "Your foresight paid off!",
        details: ["+500 Orders (from competitors' failures)"],
        source_path: 'Slide_169.mp4',
        background_css: 'bg-gray-700'
    },
    {
        id: 169,
        round_number: 3,
        title: "CH9 Career Insight - Warehouse Manager",
        type: 'video',
        source_path: 'Slide_170.mp4',
        auto_advance_after_video: false
    },
    {
        id: 170,
        round_number: 3,
        title: "RD-3 Investment Payoffs Intro",
        type: 'video',
        source_path: 'Slide_171.mp4',
        auto_advance_after_video: true
    },
    {
        id: 171,
        round_number: 3,
        title: "Payoff: #1 Business Growth (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: Business Growth Strategy",
        sub_text: "Final round business growth impact",
        details: ["+250 Capacity", "+250 Orders", "+$20 ASP"],
        source_path: 'Slide_172.mp4'
    },
    {
        id: 172,
        round_number: 3,
        title: "Payoff: #2 Production Efficiency (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: Production Efficiency",
        sub_text: "Maximum efficiency gains",
        details: ["+3000 Capacity", "+$100k Costs"],
        source_path: 'Slide_173.mp4'
    },
    {
        id: 173,
        round_number: 3,
        title: "Payoff: #3 Expanded 2nd Shift",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: Expanded 2nd Shift",
        sub_text: "Massive capacity expansion",
        details: ["+4250 Capacity", "+$750k Costs"],
        source_path: 'Slide_174.mp4'
    },
    {
        id: 174,
        round_number: 3,
        title: "Payoff: #4 Supply Chain (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: Supply Chain Optimization",
        sub_text: "Peak supply chain efficiency",
        details: ["+750 Capacity", "-$300k Costs"],
        source_path: 'Slide_175.mp4'
    },
    {
        id: 175,
        round_number: 3,
        title: "Payoff: #5 Employee Dev (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: Employee Development",
        sub_text: "Maximized workforce potential",
        details: ["+1500 Capacity"],
        source_path: 'Slide_176.mp4'
    },
    {
        id: 176,
        round_number: 3,
        title: "Payoff: #6 Boutique Sales (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: Maximize Boutique Sales",
        sub_text: "Premium market dominance",
        details: ["+3000 Orders", "+$80 ASP"],
        source_path: 'Slide_177.mp4'
    },
    {
        id: 177,
        round_number: 3,
        title: "Payoff: #7 Big Box (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: Big Box Expansion",
        sub_text: "Mass market penetration",
        details: ["+4000 Orders", "+$100k Costs", "-$40 ASP"],
        source_path: 'Slide_178.mp4'
    },
    {
        id: 178,
        round_number: 3,
        title: "Payoff: #8 ERP (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: Enterprise Resource Planning",
        sub_text: "System integration benefits",
        details: ["+250 Capacity", "+250 Orders", "+$25k Costs", "+$10 ASP"],
        source_path: 'Slide_179.mp4'
    },
    {
        id: 179,
        round_number: 3,
        title: "Payoff: #9 IT Security (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: IT & Cyber Security",
        sub_text: "Protected from cyber threats",
        details: ["Protection from future cyber attacks"],
        source_path: 'Slide_180.mp4'
    },
    {
        id: 180,
        round_number: 3,
        title: "Payoff: #10 Product Line (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: Product Line Expansion",
        sub_text: "Diversified product portfolio",
        details: ["+4000 Capacity", "+4000 Orders", "+$200k Costs", "-$80 ASP"],
        source_path: 'Slide_181.mp4'
    },
    {
        id: 181,
        round_number: 3,
        title: "Payoff: #11 Automation (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Payoff: Automation & Co-bots",
        sub_text: "Full automation benefits",
        details: ["+3750 Capacity", "+$150k Costs"],
        source_path: 'Slide_182.mp4'
    },
    {
        id: 182,
        round_number: 3,
        title: "Bonus: Production Efficiency Synergy (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Bonus: Production Efficiency Synergy",
        sub_text: "Integration bonus for Production Efficiency + manufacturing investments",
        details: ["Conditional bonuses for Production Efficiency + manufacturing"],
        source_path: 'Slide_183.mp4'
    },
    {
        id: 183,
        round_number: 3,
        title: "Bonus: Supply Chain Distribution Synergy (RD3)",
        type: 'payoff_reveal',
        main_text: "RD-3 Bonus: Supply Chain + Distribution Synergy",
        sub_text: "Enhanced efficiency from integrated logistics and distribution",
        details: ["Conditional bonus: +2000 Orders, -$100K Costs"],
        source_path: 'Slide_184.mp4'
    },
    {
        id: 184,
        round_number: 3,
        title: "Double Down Payoff",
        type: 'video',
        source_path: 'Slide_185.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "Roll the Dice!",
            message: "Have teams who chose Double Down roll their dice now."
        }
    },
    {
        id: 185,
        round_number: 3,
        title: "Bonus: Production Efficiency",
        type: 'double_down_dice_roll',
        interactive_data_key: 'A',
        main_text: "Production Efficiency Double Down",
        background_css: 'bg-gradient-to-br from-slate-900 to-slate-800'
    },
    {
        id: 186,
        round_number: 3,
        title: "Bonus: Expanded 2nd Shift",
        type: 'double_down_dice_roll',
        interactive_data_key: 'B',
        main_text: "Expanded 2nd Shift Double Down",
        background_css: 'bg-gradient-to-br from-slate-900 to-slate-800'
    },
    {
        id: 187,
        round_number: 3,
        title: "Bonus: Supply Chain",
        type: 'double_down_dice_roll',
        interactive_data_key: 'C',
        main_text: "Supply Chain Double Down",
        background_css: 'bg-gradient-to-br from-slate-900 to-slate-800'
    },
    {
        id: 188,
        round_number: 3,
        title: "Bonus: Employee Development",
        type: 'double_down_dice_roll',
        interactive_data_key: 'D',
        main_text: "Employee Development Double Down",
        background_css: 'bg-gradient-to-br from-slate-900 to-slate-800'
    },
    {
        id: 189,
        round_number: 3,
        title: "Bonus: Maximize Boutique",
        type: 'double_down_dice_roll',
        interactive_data_key: 'E',
        main_text: "Maximize Boutique Double Down",
        background_css: 'bg-gradient-to-br from-slate-900 to-slate-800'
    },
    {
        id: 190,
        round_number: 3,
        title: "Bonus: Big Box Expansion",
        type: 'double_down_dice_roll',
        interactive_data_key: 'F',
        main_text: "Big Box Expansion Double Down",
        background_css: 'bg-gradient-to-br from-slate-900 to-slate-800'
    },
    {
        id: 191,
        round_number: 3,
        title: "Bonus: ERP",
        type: 'double_down_dice_roll',
        interactive_data_key: 'G',
        main_text: "ERP Double Down",
        background_css: 'bg-gradient-to-br from-slate-900 to-slate-800'
    },
    {
        id: 192,
        round_number: 3,
        title: "Bonus: IT Security",
        type: 'double_down_dice_roll',
        interactive_data_key: 'H',
        main_text: "IT Security Double Down",
        background_css: 'bg-gradient-to-br from-slate-900 to-slate-800'
    },
    {
        id: 193,
        round_number: 3,
        title: "Bonus: Product Line",
        type: 'double_down_dice_roll',
        interactive_data_key: 'I',
        main_text: "Product Line Double Down",
        background_css: 'bg-gradient-to-br from-slate-900 to-slate-800'
    },
    {
        id: 194,
        round_number: 3,
        title: "Bonus: Automation",
        type: 'double_down_dice_roll',
        interactive_data_key: 'J',
        main_text: "Automation Double Down",
        background_css: 'bg-gradient-to-br from-slate-900 to-slate-800'
    },
    {
        id: 195,
        round_number: 3,
        title: "End of Round 3 KPIs",
        type: 'video',
        source_path: 'Slide_196.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "Final KPIs",
            message: "CFOs write final KPIs on team summary sheets. This is the end of the simulation!"
        }
    },
    {
        id: 196,
        round_number: 3,
        title: "Final Leaderboard",
        type: 'video',
        source_path: 'Slide_197.mp4',
        auto_advance_after_video: false,
        host_alert: {
            title: "Show Final Results",
            message: "Display the final leaderboard and declare the winners!"
        }
    },
    {
        id: 196.1,
        round_number: 3,
        title: "Final Leaderboard: Capacity & Orders",
        type: 'leaderboard_chart',
        main_text: "Final Leaderboard: Capacity & Orders",
        sub_text: "Final comparison of production capability and market demand."
    },
    {
        id: 196.2,
        round_number: 3,
        title: "Final Leaderboard: Cost Per Board",
        type: 'leaderboard_chart',
        main_text: "Final Leaderboard: Cost Per Board",
        sub_text: "Final efficiency comparison among all teams."
    },
    {
        id: 196.3,
        round_number: 3,
        title: "Final Leaderboard: Total Costs",
        type: 'leaderboard_chart',
        main_text: "Final Leaderboard: Total Operational Costs",
        sub_text: "Overall spending by each team in Round 3."
    },
    {
        id: 196.4,
        round_number: 3,
        title: "Final Leaderboard: ASP",
        type: 'leaderboard_chart',
        main_text: "Final Leaderboard: Average Selling Price",
        sub_text: "Final pricing strategy results."
    },
    {
        id: 196.5,
        round_number: 3,
        title: "Final Leaderboard: Revenue",
        type: 'leaderboard_chart',
        main_text: "Final Leaderboard: Total Revenue",
        sub_text: "Final revenue generation comparison."
    },
    {
        id: 196.6,
        round_number: 3,
        title: "Final Leaderboard: Net Margin",
        type: 'leaderboard_chart',
        main_text: "Final Leaderboard: Net Profit Margin",
        sub_text: "Final profitability percentage comparison."
    },
    {
        id: 196.7,
        round_number: 3,
        title: "FINAL LEADERBOARD: Net Income (WINNERS!)",
        type: 'leaderboard_chart',
        main_text: "🏆 FINAL RANKINGS 🏆",
        sub_text: "The ultimate winners of Ready or Not! Congratulations to all teams!",
        host_alert: {
            title: "Game Complete!",
            message: "The simulation is finished! Congratulations to all teams!"
        }
    },
    {
        id: 197,
        round_number: 3,
        title: "Thanks for Playing",
        type: 'video',
        source_path: 'Slide_198.mp4',
        auto_advance_after_video: false
    }
];
