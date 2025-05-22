// src/data/gameStructure.ts
import { GameStructure, Slide, GamePhaseNode, GameRound, InvestmentOption, ChallengeOption, Consequence, InvestmentPayoff, KpiEffect } from '../types';
import {
    PlayCircle, DollarSign, ListChecks, AlertTriangle, TrendingUp, BarChart3, Trophy, Settings2, Repeat, Info, Video, Zap, Users, FileText, Flag, Maximize, Minimize, HelpCircle, HandCoins, Film
} from 'lucide-react';

// --- MASTER SLIDE DATA ---
export const masterSlides: Slide[] = [
    // --- Welcome & Setup Slides (Slides 0-5) ---
    { id: 0, title: "Welcome", type: 'image', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_001.jpg?alt=media', background_css: 'bg-gray-900' },
    { id: 1, title: "Table Setup 1", type: 'image', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_002.jpg?alt=media', background_css: 'bg-gray-200' },
    { id: 2, title: "Table Setup 2", type: 'image', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_003.jpg?alt=media', background_css: 'bg-gray-200' },
    { id: 3, title: "Ready Or Not 2.0", type: 'image', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_004.jpg?alt=media', background_css: 'bg-green-700' },
    { id: 4, title: "Game Introduction Video", type: 'video', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_005.mp4?alt=media', auto_advance_after_video: true },
    { id: 5, title: "Let's Get It On!", type: 'video', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_006.mp4?alt=media', auto_advance_after_video: false, teacher_alert: { title: "Begin RD-1 Investments", message: "The RD-1 Investment overview video will play next, followed by the 15-minute investment period. Ensure teams are ready." } },

    // --- Round 1 Invest (Slides 6, then new 8, then 9, 10) ---
    { id: 6, title: "RD-1 Investments Overview Video", type: 'video', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_007.mp4?alt=media', auto_advance_after_video: true },
    {
        id: 8,
        title: "RD-1 Investment Decision Period (15 Min Video Timer)",
        type: 'interactive_invest',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_008.mp4?alt=media",
        interactive_data_key: 'rd1-invest',
        main_text: "RD-1 INVEST: TIMER ACTIVE",
        sub_text: "The video playing serves as your 15-minute timer. Make all investment decisions on your team device before the video ends.",
        auto_advance_after_video: false,
        teacher_alert: {
            title: "RD-1 Investment Period Concluded",
            message: "The 15-minute investment period has ended or all teams have submitted. Click OK to proceed to Year 1 events."
        },
        background_css: 'bg-slate-800'
    },
    { id: 9, title: "RD-1 Intro: Year 1 Events Begin", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_009.mp4?alt=media", auto_advance_after_video: true },
    { id: 10, title: "ALU Factory Animation (Leads to CH1)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_010.mp4?alt=media", auto_advance_after_video: false, teacher_alert: { title: "Impact Event #1 Approaching", message: "Prepare for Impact Event #1: Machinery Failure. Click OK to introduce the challenge."} },

    // --- Round 1 Choice 1 (Machinery Failure - Slides 11-18) ---
    { id: 11, title: "Impact Event #1: The Setup", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_011.mp4?alt=media", auto_advance_after_video: true },
    { id: 12, title: "Impact Event #1: Option A", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_012.mp4?alt=media", auto_advance_after_video: true },
    { id: 13, title: "Impact Event #1: Option B", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_013.mp4?alt=media", auto_advance_after_video: true },
    { id: 14, title: "Impact Event #1: Option C", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_014.mp4?alt=media", auto_advance_after_video: true },
    { id: 15, title: "Impact Event #1: Option D", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_015.mp4?alt=media", auto_advance_after_video: true },
    { id: 16, title: "TPG Instructions", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_016.mp4?alt=media", auto_advance_after_video: true },
    { id: 17, title: "CH1: Machinery Failure - Make Your Choice", type: 'interactive_choice', interactive_data_key: 'ch1', main_text: "Challenge #1: MACHINERY FAILURE", sub_text: "Teams: Discuss and select your response using your team device. Timer is on screen.", timer_duration_seconds: 3 * 60, background_css: 'bg-orange-800', teacher_alert: { title: "Choice 1 Closed", message: "All teams submitted or time is up. Click OK to see consequences."} },
    { id: 18, title: "Impact Event #1: Options Summary Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_017_Part2.mp4?alt=media", auto_advance_after_video: false },

    // --- Round 1 Choice 1 Consequences (Slides 19-24) ---
    { id: 19, title: "Consequences Overview Video CH1", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_018.mp4?alt=media", auto_advance_after_video: true },
    { id: 20, title: "CH1 Consequences: Option A Details", type: 'consequence_reveal', main_text: "Consequence for Option A: Purchase CNC Machine", sub_text: "Initial Impact: -250 Capacity, +$50k Costs. Long-term: Permanent KPI Card for +500 Capacity in future rounds.", details: ["-250 Current Capacity", "+$50k Current Costs", "Permanent KPI Card: +500 Capacity (Future Rounds)"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_019.jpg?alt=media', background_css: 'bg-gray-700' },
    { id: 21, title: "CH1 Consequences: Option B Details", type: 'consequence_reveal', main_text: "Consequence for Option B: Replacement Die Cast", sub_text: "Quick installation, minimal disruption. Initial Impact: +$25k Costs.", details: ["-250 Current Capacity (from spreadsheet 'Equip Fail Event')", "+$25k Current Costs"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_020.jpg?alt=media', background_css: 'bg-gray-700' },
    { id: 22, title: "CH1 Consequences: Option C Details", type: 'consequence_reveal', main_text: "Consequence for Option C: Outsource Fins", sub_text: "Flexible capacity, lower initial costs, but less control. Initial Impact: +250 Capacity (net gain), +$25k Costs.", details: ["+250 Current Capacity (compared to doing nothing/broken state)", "+$25k Current Costs"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_021.jpg?alt=media', background_css: 'bg-gray-700' },
    { id: 23, title: "CH1 Consequences: Option D Details", type: 'consequence_reveal', main_text: "Consequence for Option D: Do Nothing", sub_text: "Production slowdowns, increased repairs, and cancelled orders. Initial Impact: -500 Capacity, +$75k Costs, -200 Orders.", details: ["-500 Current Capacity", "+$75k Current Costs", "-200 Current Orders (from spreadsheet)"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_022.jpg?alt=media', background_css: 'bg-gray-700' },
    { id: 24, title: "CH1 Career Insight Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_023.mp4?alt=media", auto_advance_after_video: false, teacher_alert: { title: "Year 1 Impact Event Complete", message: "Prepare for Impact Event #2 in Year 2. Click OK to proceed."}},

    // --- Round 1 Choice 2 (New Tax - Slides 25-33) ---
    { id: 25, title: "Transition to Year 2 Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_024.mp4?alt=media", auto_advance_after_video: true },
    { id: 26, title: "News Broadcast Video (Year 2 Start)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_025.mp4?alt=media", auto_advance_after_video: true },
    { id: 27, title: "Impact Event #2: Setup Video (New Tax)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_026.mp4?alt=media", auto_advance_after_video: true },
    { id: 28, title: "Impact Event #2: Option A Video (Raise Prices)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_027.mp4?alt=media", auto_advance_after_video: true },
    { id: 29, title: "Impact Event #2: Option B Video (Increase Marketing)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_028.mp4?alt=media", auto_advance_after_video: true },
    { id: 30, title: "Impact Event #2: Option C Video (Cost Cutting)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_029.mp4?alt=media", auto_advance_after_video: true },
    { id: 31, title: "Impact Event #2: Option D Video (Do Nothing)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_030.mp4?alt=media", auto_advance_after_video: true },
    { id: 32, title: "CH2: New Tax - Make Your Choice", type: 'interactive_choice', interactive_data_key: 'ch2', main_text: "Challenge #2: NEW TAX", sub_text: "Teams: Discuss and select your response using your team device. Timer is on screen.", timer_duration_seconds: 3 * 60, background_css: 'bg-indigo-800', teacher_alert: { title: "Choice 2 Closed", message: "All teams submitted or time is up. Click OK to see consequences."} },
    { id: 33, title: "Impact Event #2: Options Summary Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_031_Part2.mp4?alt=media", auto_advance_after_video: false },

    // --- Round 1 Choice 2 Consequences (Slides 34-39) ---
    { id: 34, title: "Consequences Overview Video CH2", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_032.mp4?alt=media", auto_advance_after_video: true },
    { id: 35, title: "CH2 Consequences: Option A Details", type: 'consequence_reveal', main_text: "Consequence for Option A (Raise Prices)", sub_text: "ASP increases by $20. Demand stable.", details: ["+$20 ASP", "-250 Orders (per spreadsheet)"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_033.jpg?alt=media', background_css: 'bg-gray-700' },
    { id: 36, title: "CH2 Consequences: Option B Details", type: 'consequence_reveal', main_text: "Consequence for Option B (Increase Marketing)", sub_text: "Orders increase by 500, Marketing Costs increase by $25k.", details: ["+500 Orders", "+$25k Costs"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_034.jpg?alt=media', background_css: 'bg-gray-700' },
    { id: 37, title: "CH2 Consequences: Option C Details", type: 'consequence_reveal', main_text: "Consequence for Option C (Cost Cutting)", sub_text: "Costs decrease by $25k, but Capacity drops by 250 due to morale/service cuts.", details: ["-250 Capacity", "-$25k Costs"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_035.jpg?alt=media', background_css: 'bg-gray-700' },
    { id: 38, title: "CH2 Consequences: Option D Details", type: 'consequence_reveal', main_text: "Consequence for Option D (Do Nothing - New Tax)", sub_text: "Operational costs increase by $50k due to absorbing the new tax.", details: ["+$50k Costs (New Tax)"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_036.jpg?alt=media', background_css: 'bg-gray-700' },
    { id: 39, title: "CH2 Career Insight Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_037.mp4?alt=media", auto_advance_after_video: false, teacher_alert: { title: "Impact Event #2 Complete", message: "Prepare for Impact Event #3. Click OK to proceed."} },

    // --- Round 1 Choice 3 (Recession - Slides 40-48) ---
    { id: 40, title: "Transition to later in Year 2 Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_038.mp4?alt=media", auto_advance_after_video: true },
    { id: 41, title: "News Broadcast Video (Mid Year 2 - Recession)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_039.mp4?alt=media", auto_advance_after_video: true },
    { id: 42, title: "Impact Event #3: Setup Video (Recession)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_040.mp4?alt=media", auto_advance_after_video: true },
    { id: 43, title: "Impact Event #3: Option A Video (Layoffs)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_041.mp4?alt=media", auto_advance_after_video: true },
    { id: 44, title: "Impact Event #3: Option B Video (Furlough/Workshare)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_042.mp4?alt=media", auto_advance_after_video: true },
    { id: 45, title: "Impact Event #3: Option C Video (Maintain/Cut OT)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_043.mp4?alt=media", auto_advance_after_video: true },
    { id: 46, title: "Impact Event #3: Option D Video (Do Nothing)", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_044.mp4?alt=media", auto_advance_after_video: true },
    { id: 47, title: "CH3: Recession - Make Your Choice", type: 'interactive_choice', interactive_data_key: 'ch3', main_text: "Challenge #3: RECESSION", sub_text: "Teams: Discuss and select your response using your team device. Timer is on screen.", timer_duration_seconds: 3 * 60, background_css: 'bg-teal-800', teacher_alert: { title: "Choice 3 Closed", message: "All teams submitted or time is up. Click OK to see consequences."} },
    { id: 48, title: "Impact Event #3: Options Summary Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_045_Part2.mp4?alt=media", auto_advance_after_video: false },

    // --- Round 1 Choice 3 Consequences (Slides 49-54) ---
    { id: 49, title: "Consequences Overview Video CH3", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_046.mp4?alt=media", auto_advance_after_video: true },
    { id: 50, title: "CH3 Consequences: Option A Details", type: 'consequence_reveal', main_text: "Consequence for Option A (Layoffs)", sub_text:"Significant cost reduction and capacity decrease. Future capacity also impacted.", details:["-1250 Current Capacity", "-$300k Current Costs", "Permanent KPI Card: -1000 Capacity (Future - per spreadsheet)"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_047.jpg?alt=media', background_css: 'bg-gray-700'},
    { id: 51, title: "CH3 Consequences: Option B Details", type: 'consequence_reveal', main_text: "Consequence for Option B (Furlough/Workshare)", sub_text:"Reduces costs and capacity, but less severely than full layoffs.", details: ["-1000 Current Capacity", "-$200k Current Costs"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_048.jpg?alt=media', background_css: 'bg-gray-700'},
    { id: 52, title: "CH3 Consequences: Option C Details", type: 'consequence_reveal', main_text: "Consequence for Option C (Maintain/Cut OT)", sub_text:"Moderate cost savings with a smaller capacity hit.", details: ["-500 Current Capacity", "-$100k Current Costs"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_049.jpg?alt=media', background_css: 'bg-gray-700'},
    { id: 53, title: "CH3 Consequences: Option D Details", type: 'consequence_reveal', main_text: "Consequence for Option D (Do Nothing - Recession)", sub_text:"Demand drops significantly, and unchanged fixed costs hurt margins. Morale issues reduce capacity.", details: ["-1000 Current Orders (Demand Drop)", "-1000 Current Capacity (Morale/Quits)", "+$25k Current Costs (Inefficiency/Admin)"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_050.jpg?alt=media', background_css: 'bg-gray-700'},
    { id: 54, title: "CH3 Career Insight Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_051.mp4?alt=media", auto_advance_after_video: false, teacher_alert: { title: "Impact Event #3 Complete", message: "Prepare for RD-1 Investment Payoffs. Click OK to proceed."} },

    // --- Round 1 Investment Payoffs (Slides 55-61) ---
    { id: 55, title: "RD-1 Investment Payoff Intro Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_053.mp4?alt=media", auto_advance_after_video: true },
    { id: 56, title: "Payoff: #1 Biz Growth Strategy", type: 'payoff_reveal', main_text: "RD-1 Payoff: Business Growth Strategy", sub_text:"Impact: Capacity: +250, Orders: +250, ASP: +$20", details:["+250 Capacity", "+250 Orders", "+$20 ASP"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_054.jpg?alt=media' },
    { id: 57, title: "Payoff: #2 Production Efficiency", type: 'payoff_reveal', main_text: "RD-1 Payoff: Production Efficiency", sub_text:"Impact: Capacity: +1500", details:["+1500 Capacity"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_055.jpg?alt=media' },
    { id: 58, title: "Payoff: #3 Add 2nd Shift", type: 'payoff_reveal', main_text: "RD-1 Payoff: Add 2nd Shift", sub_text:"Impact: Capacity: +1500, Costs: +$300k", details:["+1500 Capacity", "+$300k Costs"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_056.jpg?alt=media' },
    { id: 59, title: "Payoff: #4 Supply Chain Optimization", type: 'payoff_reveal', main_text: "RD-1 Payoff: Supply Chain Optimization", sub_text:"Impact: Capacity: +250, Costs: -$100k", details:["+250 Capacity", "-$100k Costs"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_057.jpg?alt=media' },
    { id: 60, title: "Payoff: #5 Employee Development", type: 'payoff_reveal', main_text: "RD-1 Payoff: Employee Development", sub_text:"Impact: Capacity: +250, Costs: -$25k", details:["+250 Capacity", "-$25k Costs"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_058.jpg?alt=media' },
    { id: 61, title: "Payoff: #6 Maximize Sales (Boutique)", type: 'payoff_reveal', main_text: "RD-1 Payoff: Maximize Sales (Boutique)", sub_text:"Impact: Orders: +500, ASP: +$20", details:["+500 Orders", "+$20 ASP"], source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_059.jpg?alt=media', teacher_alert: { title: "RD-1 Payoffs Complete", message: "All investment payoffs for Round 1 have been revealed. Click OK to review End of Round KPIs."} },

    // --- Round 1 End (Slides 62-63.7) ---
    { id: 62, title: "End of Round 1 KPIs", type: 'kpi_summary_instructional', main_text: "END OF ROUND 1 KPIs", sub_text: "CFOs: Review your team's final KPIs on your device and record them on your Team Summary Sheet. The facilitator will display the leaderboard next.", source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_063.jpg?alt=media', teacher_alert: { title: "KPI Review", message: "Ensure teams have reviewed their KPIs. Click OK to display the Leaderboard."} },
    { id: 63, title: "RD-1 Leaderboard Intro Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_064.mp4?alt=media", auto_advance_after_video: true },
    { id: 63.1, title: "Leaderboard: RD-1 Capacity & Orders", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_cap_ord', main_text:"RD-1 Leaderboard: Capacity & Orders", sub_text:"Team comparison of production capability and market demand generated." },
    { id: 63.2, title: "Leaderboard: RD-1 Cost Per Board", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_cpb', main_text:"RD-1 Leaderboard: Cost Per Board", sub_text:"Comparing efficiency in production costs among teams." },
    { id: 63.3, title: "Leaderboard: RD-1 Total Costs", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_costs', main_text:"RD-1 Leaderboard: Total Operational Costs", sub_text:"Overall spending by each team in Round 1." },
    { id: 63.4, title: "Leaderboard: RD-1 ASP", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_asp', main_text:"RD-1 Leaderboard: Average Selling Price (ASP)", sub_text:"Team pricing power and strategy in the market." },
    { id: 63.5, title: "Leaderboard: RD-1 Revenue", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_revenue', main_text:"RD-1 Leaderboard: Total Revenue", sub_text:"Comparing total income generated from sales." },
    { id: 63.6, title: "Leaderboard: RD-1 Net Margin", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_margin', main_text:"RD-1 Leaderboard: Net Profit Margin", sub_text:"Profitability as a percentage of revenue for each team." },
    { id: 63.7, title: "Leaderboard: RD-1 Net Income (RANKED)", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_income', main_text:"RD-1 Leaderboard: Net Income (Overall Ranking)", sub_text:"Final profit ranking for Round 1. Click OK to proceed to Round 2 setup.", teacher_alert: {title: "Round 1 Complete!", message: "Round 1 is concluded. Click OK to prepare for Round 2."} },

    // --- ROUND 2 SLIDES ---
    { id: 100, title: "Round 2 Introduction Video", type: 'video', source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_065.mp4?alt=media", auto_advance_after_video: false, teacher_alert: {title: "Begin RD-2 Investments", message: "The RD-2 Investment overview video will play next, followed by the investment period. Ensure teams are ready."} },
    {
        id: 101,
        title: "RD-2 Investment Decision Period",
        type: 'interactive_invest',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_070.mp4?alt=media", // This is RD2 Timer Video
        interactive_data_key: 'rd2-invest',
        main_text: "RD-2 INVEST: TIMER ACTIVE",
        sub_text: "Video timer active. Make your RD-2 investment decisions on your team device.",
        auto_advance_after_video: false,
        teacher_alert: { title: "RD-2 Investment Period Ended", message: "RD-2 investments are closed. Click OK to proceed." }
    },
    // Placeholder for CH4 setup and options. Example:
    { id: 102, title: "RD-2 CH4 Intro Video", type: 'video', source_url: "placeholder_rd2_ch4_intro.mp4", auto_advance_after_video: true },
    { id: 103, title: "CH4: Make Your Choice", type: 'interactive_choice', interactive_data_key: 'ch4', main_text: "Challenge #4: Supply Chain Disruption", sub_text: "Teams: Discuss and select your response.", timer_duration_seconds: 180, teacher_alert: {title: "CH4 Closed", message:"CH4 Decisions are in. Click OK for consequences."} },
    // ... more RD2 slides (consequences, payoffs, kpi, leaderboard)

    // --- ROUND 3 SLIDES ---
    { id: 200, title: "Round 3 Introduction Video", type: 'video', source_url: "placeholder_rd3_intro.mp4", auto_advance_after_video: false, teacher_alert: {title: "Begin RD-3 Investments", message: "Teams will now make RD-3 Investments. The timer video will begin."} },
    {
        id: 201,
        title: "RD-3 Investment Decision Period",
        type: 'interactive_invest',
        source_url: "placeholder_rd3_invest_timer_video.mp4",
        interactive_data_key: 'rd3-invest',
        main_text: "RD-3 INVEST: TIMER ACTIVE",
        sub_text: "Video timer active. Make your RD-3 investment decisions.",
        auto_advance_after_video: false,
        teacher_alert: { title: "RD-3 Investments Closed", message: "RD-3 investments are closed. Prepare for Double Down. Click OK." }
    },
    {
        id: 202,
        title: "Double Down Opportunity Decision",
        type: 'interactive_double_down_prompt',
        interactive_data_key: 'ch-dd-prompt',
        main_text: "DOUBLE DOWN OPPORTUNITY!",
        sub_text: "Decide if your team wants to take the Double Down risk/reward. Timer on screen.",
        timer_duration_seconds: 3 * 60,
        background_css: 'bg-red-700',
        teacher_alert: { title: "Double Down Decision Closed", message: "Teams have made their Double Down choice. Click OK for selection or to skip to CH8." }
    },
    {
        id: 203,
        title: "Select Double Down Investments",
        type: 'interactive_double_down_select',
        interactive_data_key: 'ch-dd-select',
        main_text: "CHOOSE YOUR DOUBLE DOWN",
        sub_text: "If you opted-in: Sacrifice one RD-3 investment and Double Down on another.",
        background_css: 'bg-red-800',
        teacher_alert: { title: "Double Down Selections Made", message: "Double Down selections are complete (if applicable). Click OK to proceed to CH8." }
    },
    // ... more RD3 slides (CH8, CH9, consequences, payoffs, dd-payoff, kpi, leaderboard)
    { id: 300, title: "Game Over - Final Results", type: 'game_end_summary', main_text: "THANKS FOR PLAYING!", sub_text:"Review your final scores and rankings.", source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_197.jpg?alt=media' }
];

// --- MASTER GAME PHASE NODE DATA (for Journey Map) ---
const gamePhases_Welcome: GamePhaseNode[] = [
    { id: 'welcome-intro', label: "WELCOME", sub_label: "Start Here", icon_name: 'PlayCircle', phase_type: 'welcome', round_number: 0, slide_ids: [0,1,2,3], is_interactive_student_phase: false, expected_duration_minutes: 3 },
    { id: 'game-intro-video', label: "GAME INTRO", icon_name: 'Film', phase_type: 'narration', round_number: 0, slide_ids: [4,5], is_interactive_student_phase: false, expected_duration_minutes: 7 },
];

const gamePhases_Round1: GamePhaseNode[] = [
    {
        id: 'rd1-invest',
        label: "RD-1 INVEST",
        sub_label: "Years 1&2",
        icon_name: 'DollarSign',
        phase_type: 'invest',
        round_number: 1,
        slide_ids: [6, 8, 9, 10],
        is_interactive_student_phase: true,
        expected_duration_minutes: 20
    },
    { id: 'ch1', label: "CHOICE 1", sub_label: "Machinery", icon_name: 'ListChecks', phase_type: 'choice', round_number: 1, slide_ids: [11,12,13,14,15,16,17,18], is_interactive_student_phase: true, expected_duration_minutes: 8 },
    { id: 'ch1-conseq', label: "CONSEQ.", sub_label: "CH1", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 1, slide_ids: [19,20,21,22,23,24], is_interactive_student_phase: false, expected_duration_minutes: 5 },
    { id: 'ch2', label: "CHOICE 2", sub_label: "New Tax", icon_name: 'ListChecks', phase_type: 'choice', round_number: 1, slide_ids: [25,26,27,28,29,30,31,32,33], is_interactive_student_phase: true, expected_duration_minutes: 8 },
    { id: 'ch2-conseq', label: "CONSEQ.", sub_label: "CH2", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 1, slide_ids: [34,35,36,37,38,39], is_interactive_student_phase: false, expected_duration_minutes: 5 },
    { id: 'ch3', label: "CHOICE 3", sub_label: "Recession", icon_name: 'ListChecks', phase_type: 'choice', round_number: 1, slide_ids: [40,41,42,43,44,45,46,47,48], is_interactive_student_phase: true, expected_duration_minutes: 8 },
    { id: 'ch3-conseq', label: "CONSEQ.", sub_label: "CH3", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 1, slide_ids: [49,50,51,52,53,54], is_interactive_student_phase: false, expected_duration_minutes: 5 },
    { id: 'rd1-payoff', label: "RD-1 PAYOFF", icon_name: 'TrendingUp', phase_type: 'payoff', round_number: 1, slide_ids: [55,56,57,58,59,60,61], is_interactive_student_phase: false, expected_duration_minutes: 5 },
    { id: 'rd1-kpi', label: "RD-1 KPIs", icon_name: 'BarChart3', phase_type: 'kpi', round_number: 1, slide_ids: [62], is_interactive_student_phase: false, expected_duration_minutes: 2 },
    { id: 'rd1-leaderboard', label: "LEADERBOARD", icon_name: 'Trophy', phase_type: 'leaderboard', round_number: 1, slide_ids: [63, 63.1, 63.2, 63.3, 63.4, 63.5, 63.6, 63.7], is_interactive_student_phase: false, expected_duration_minutes: 5 },
];

const gamePhases_Round2: GamePhaseNode[] = [
    { id: 'rd2-invest', label: "RD-2 INVEST", sub_label: "Years 3&4", icon_name: 'DollarSign', phase_type: 'invest', round_number: 2, slide_ids: [100, 101], is_interactive_student_phase: true, expected_duration_minutes: 12 },
    { id: 'ch4', label: "CHOICE 4", sub_label:"Supply Chain", icon_name: 'ListChecks', phase_type: 'choice', round_number: 2, slide_ids: [102, 103], is_interactive_student_phase: true, expected_duration_minutes: 3 },
    { id: 'ch4-conseq', label: "CONSEQ.", sub_label: "CH4", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 2, slide_ids: [], is_interactive_student_phase: false, expected_duration_minutes: 5 },
    // Add CH5, CH6, CH7 here with their slides
    { id: 'rd2-payoff', label: "RD-2 PAYOFF", icon_name: 'TrendingUp', phase_type: 'payoff', round_number: 2, slide_ids: [], is_interactive_student_phase: false, expected_duration_minutes: 5 },
    { id: 'rd2-kpi', label: "RD-2 KPIs", icon_name: 'BarChart3', phase_type: 'kpi', round_number: 2, slide_ids: [], is_interactive_student_phase: false, expected_duration_minutes: 2 },
    { id: 'rd2-leaderboard', label: "LEADERBOARD", icon_name: 'Trophy', phase_type: 'leaderboard', round_number: 2, slide_ids: [], is_interactive_student_phase: false, expected_duration_minutes: 5 },
];

const gamePhases_Round3: GamePhaseNode[] = [
    { id: 'rd3-invest', label: "RD-3 INVEST", sub_label: "Year 5", icon_name: 'DollarSign', phase_type: 'invest', round_number: 3, slide_ids: [200, 201], is_interactive_student_phase: true, expected_duration_minutes: 12 },
    { id: 'ch-dd-prompt', label: "DOUBLE DOWN", sub_label: "Opportunity", icon_name: 'Repeat', phase_type: 'double-down-prompt', round_number: 3, slide_ids: [202], is_interactive_student_phase: true, expected_duration_minutes: 3 },
    { id: 'ch-dd-select', label: "DD SELECT", sub_label: "Make Choice", icon_name: 'HandCoins', phase_type: 'double-down-select', round_number: 3, slide_ids: [203], is_interactive_student_phase: true, expected_duration_minutes: 2 },
    { id: 'ch8', label: "CHOICE 8", sub_label:"Cyber Attack", icon_name: 'ListChecks', phase_type: 'choice', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: true, expected_duration_minutes: 3 },
    { id: 'ch8-conseq', label: "CONSEQ.", sub_label: "CH8", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: false, expected_duration_minutes: 5 },
    // Add CH9 and its consequences
    { id: 'rd3-payoff', label: "RD-3 PAYOFF", icon_name: 'TrendingUp', phase_type: 'payoff', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: false, expected_duration_minutes: 5 },
    { id: 'dd-payoff', label: "DD PAYOFF", icon_name: 'Zap', phase_type: 'double-down-payoff', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: false, expected_duration_minutes: 3 },
    { id: 'rd3-kpi', label: "RD-3 KPIs", icon_name: 'BarChart3', phase_type: 'kpi', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: false, expected_duration_minutes: 2 },
    { id: 'final-leaderboard', label: "FINAL BOARD", icon_name: 'Trophy', phase_type: 'leaderboard', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: false, expected_duration_minutes: 5 },
];

const gamePhases_End: GamePhaseNode[] = [
    { id: 'game-complete', label: "GAME COMPLETE", icon_name: 'Flag', phase_type: 'game-end', round_number: 3, slide_ids: [300], is_interactive_student_phase: false, expected_duration_minutes: 2 },
];

export const masterInvestmentOptions: Record<string, InvestmentOption[]> = {
    'rd1-invest': [
        { id: 'rd1_inv_biz_growth', name: "1. Biz Growth Strat.", cost: 50000, description: "Invest in new market research and sales channels to increase orders and potentially ASP." },
        { id: 'rd1_inv_prod_effic', name: "2. Prod. Efficiency", cost: 100000, description: "Upgrade tools and streamline assembly processes to boost capacity." },
        { id: 'rd1_inv_2nd_shift', name: "3. Add 2nd Shift", cost: 50000, description: "Hire and train staff for a second production shift, increasing capacity but also costs." },
        { id: 'rd1_inv_sup_chain', name: "4. Supply Chain Opt.", cost: 75000, description: "Negotiate better supplier terms and improve logistics for cost savings and minor capacity gains." },
        { id: 'rd1_inv_emp_dev', name: "5. Employee Dev.", cost: 50000, description: "Invest in training programs for current employees to improve efficiency and capacity." },
        { id: 'rd1_inv_boutique', name: "6. Maximize Sales (Boutique)", cost: 100000, description: "Open a small boutique retail store to directly reach customers, increasing orders and ASP." },
    ],
    'rd2-invest': [
        { id: 'rd2_inv_strategic_plan', name: "1. Strategic Plan (KPI Card)", cost: 75000, description: "Develop a comprehensive strategic plan, potentially unlocking future KPI benefits." },
        { id: 'rd2_inv_prod_efficiency_2', name: "2. Production Efficiency II", cost: 200000, description: "Further investments in production line optimization for significant capacity gains." },
        { id: 'rd2_inv_add_exp_2nd_shift', name: "3. Add/Expand 2nd Shift", cost: 75000, description: "Increase staffing or hours for the second shift to boost capacity further." },
        { id: 'rd2_inv_supply_chain_opt_2', name: "4. Supply Chain Optimization II", cost: 150000, description: "Deeper supply chain integration for substantial cost reductions and better material flow." },
        { id: 'rd2_inv_emp_dev_2', name: "5. Employee Development II", cost: 175000, description: "Advanced training and skill development programs for workforce productivity." },
        { id: 'rd2_inv_maximize_boutique', name: "6. Maximize Boutique Sales & Distro", cost: 225000, description: "Expand boutique operations and distribution network for higher sales and market reach." },
        { id: 'rd2_inv_expand_dist_channels', name: "7. Expand Distribution Channels - Big Box", cost: 125000, description: "Partner with big-box retailers to significantly increase order volume." },
        { id: 'rd2_inv_erp', name: "8. Enterprise Resource Planning/Business Software", cost: 100000, description: "Implement ERP system for better overall business management and efficiency." },
        { id: 'rd2_inv_it_cybersecurity', name: "9. IT Infrastructure and Cybersecurity", cost: 50000, description: "Upgrade IT systems and cybersecurity measures to protect operations and data." },
        { id: 'rd2_inv_prod_line_expansion', name: "10. Product Line Expansion - Inflatables", cost: 150000, description: "Diversify into the inflatable paddleboard market." },
        { id: 'rd2_inv_automation_cobots', name: "11. Technology Solutions - Automation and Cobots", cost: 150000, description: "Introduce automation and collaborative robots to the production line." },
        { id: 'rd2_inv_market_share_attack', name: "12. Market Share Attack", cost: 25000, description: "Aggressive marketing campaign to capture market share." },
    ],
    'rd3-invest': [ /* Populate based on your RD3 Invest spreadsheet tab */ ],
};

export const masterChallengeOptions: Record<string, ChallengeOption[]> = {
    'ch1': [
        { id: "A", text: "Purchase an automated CNC Machine for making fins. It's more complex than casting, but could make lighter, stronger, more customizable fins and increase your CAP. Estimated COST is $50K.", estimated_cost: 50000, is_default_choice: false },
        { id: "B", text: "Purchase replacement die casting equipment. Your employees already know how to operate it so it's unlikely to disrupt operations. Estimated COST is $25K.", estimated_cost: 25000, is_default_choice: false },
        { id: "C", text: "Outsource aluminum fin manufacturing to a local machine shop. This opens the door to customized CNC Machined Fins and CAP flexibility, but reduces direct control over this part of your manufacturing. Estimated COST is $25K.", estimated_cost: 25000, is_default_choice: false },
        { id: "D", text: "Do nothing. Attempt to repair existing equipment as failures occur.", estimated_cost: 0, is_default_choice: true },
    ],
    'ch2': [
        { id: "A", text: "Raise prices 2% to pass the entire tax thru to customers. This would raise ASP by $20 (from $1000 to $1020).", estimated_cost: 0, immediate_kpi_impact_preview: "+$20 ASP, -250 Orders", is_default_choice: false },
        { id: "B", text: "Increase annual marketing budget by $25K to increase demand. If successful, this could result in 500 more Orders each year.", estimated_cost: 25000, immediate_kpi_impact_preview: "+500 Orders, +$25k Costs", is_default_choice: false },
        { id: "C", text: "Enact cost cutting measures like ending free coffee and snacks, etc. Estimated savings are $25,000.", estimated_cost: -25000, immediate_kpi_impact_preview: "-$25k Costs, -250 Capacity", is_default_choice: false },
        { id: "D", text: "Do Nothing. Maintain prices and current marketing budget and absorb the tax.", estimated_cost: 0, immediate_kpi_impact_preview: "+$50k Costs (Tax)", is_default_choice: true },
    ],
    'ch3': [
        { id: "A", text: "Lay-off 2 salaried, 4 hourly. Reduce CAP by 1250, Costs by $300K.", estimated_cost: -300000, immediate_kpi_impact_preview: "-1250 CAP, -$300k Costs", is_default_choice: false },
        { id: "B", text: "Furlough/Workshare. Reduce CAP by 1000, Costs by $200K.", estimated_cost: -200000, immediate_kpi_impact_preview: "-1000 CAP, -$200k Costs", is_default_choice: false },
        { id: "C", text: "Maintain headcount, cut OT/Temps. Reduce CAP by 500, Costs by $100K.", estimated_cost: -100000, immediate_kpi_impact_preview: "-500 CAP, -$100k Costs", is_default_choice: false },
        { id: "D", text: "Do Nothing. Lose 1000 Orders and 1000 Capacity. Costs increase $25k.", estimated_cost: 25000, immediate_kpi_impact_preview: "-1000 Orders, -1000 CAP, +$25k Costs", is_default_choice: true },
    ],
    'ch-dd-prompt': [
        {id: "yes_dd", text: "Yes, I want to Double Down!", is_default_choice: false},
        {id: "no_dd", text: "No, I'll stick with my current RD-3 investments.", is_default_choice: true}
    ],
    // CH4, CH5, CH6, CH7, CH8, CH9 options to be filled from spreadsheet
    'ch4': [{id: "D", text: "Do Nothing (Placeholder for CH4)", estimated_cost: 0, is_default_choice: true}],
    // ...
};

export const masterConsequences: Record<string, Consequence[]> = {
    'ch1-conseq': [
        {
            id: 'ch1_conseq_a', challenge_option_id: 'A',
            narrative_text: "The complex CNC machine takes longer than expected to arrive and integrate into your operations. You struggle for months to reach previous production levels.",
            details: ["Initial: -250 CAP, +$50K COSTS.", "Future: Receive Permanent KPI Card: +500 Capacity (RD-2 & RD-3)."],
            effects: [
                { kpi: 'capacity', change_value: -250, timing: 'immediate', description: 'CNC setup delay' },
                { kpi: 'cost', change_value: 50000, timing: 'immediate', description: 'CNC setup cost' }, // Option cost
                { kpi: 'capacity', change_value: 500, timing: 'permanent_next_round_start', applies_to_rounds: [2,3], description: 'CNC Machine Bonus Capacity' }
            ],
            impact_card_image_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FKPI_Impact_Cards%2FPerm_KPI_Card_CNC.jpg?alt=media'
        },
        {
            id: 'ch1_conseq_b', challenge_option_id: 'B',
            narrative_text: "Replacement equipment is easy to operate, but it took weeks for it to arrive; you've solved the problem and production is back on track, but you still lost some CAP and incurred costs.",
            details: ["-250 CAP (initial problem)", "+$25K COST (option cost)"],
            effects: [
                { kpi: 'capacity', change_value: -250, timing: 'immediate', description: 'Equip. Fail Event (unavoidable)' },
                { kpi: 'cost', change_value: 25000, timing: 'immediate', description: 'Replacement Die Cast Cost' }
            ]
        },
        {
            id: 'ch1_conseq_c', challenge_option_id: 'C',
            narrative_text: "Outsourcing allowed you to quickly resume SUP production and repurpose employees & use the floor space to help crank out more boards.",
            details: ["+250 CAP (net gain after initial problem)", "+$25K COST (option cost)"], // Net effect after -250 from equip fail
            effects: [
                { kpi: 'capacity', change_value: -250, timing: 'immediate', description: 'Equip. Fail Event (unavoidable)' }, // Base problem
                { kpi: 'capacity', change_value: 500, timing: 'immediate', description: 'Outsourcing & Repurposing Benefit'}, // Benefit of choice C
                { kpi: 'cost', change_value: 25000, timing: 'immediate', description: 'Outsourcing Setup Cost' }
            ]
        },
        {
            id: 'ch1_conseq_d', challenge_option_id: 'D',
            narrative_text: "Your hemming and hawing have caused significant delays. Channel partners are canceling orders and the production manager has started ordering expensive fins online.",
            details: ["-500 CAP (total from equip fail & delay)", "+$75K COST", "-200 Orders"],
            effects: [
                { kpi: 'capacity', change_value: -500, timing: 'immediate', description: 'Equip. Fail & Delay' }, // Combines initial -250 and further -250
                { kpi: 'cost', change_value: 75000, timing: 'immediate', description: 'Increased repair/rush costs' },
                { kpi: 'orders', change_value: -200, timing: 'immediate', description: 'Cancelled orders' }
            ]
        },
    ],
    'ch2-conseq': [
        { id: 'ch2_conseq_a', challenge_option_id: 'A', narrative_text: "Your ASP increase builds some additional profits. The fear that customers would balk at $1,000-plus price proved to be a false narrative.",
            details: ["+$20 ASP", "-250 Orders"],
            effects: [{ kpi: 'asp', change_value: 20, timing: 'immediate', description: 'Price Increase' }, { kpi: 'orders', change_value: -250, timing: 'immediate', description: 'Slight demand drop from price increase' }] },
        { id: 'ch2_conseq_b', challenge_option_id: 'B', narrative_text: "Your marketing efforts pay off and increase Orders.",
            details: ["+500 Orders", "+$25K COSTS"],
            effects: [{ kpi: 'orders', change_value: 500, timing: 'immediate', description: 'Marketing Boost' }, { kpi: 'cost', change_value: 25000, timing: 'immediate', description: 'Increased Marketing Spend' }] },
        { id: 'ch2_conseq_c', challenge_option_id: 'C', narrative_text: "You found some savings, but cost cutting didn’t work as planned. It takes employees from their primary work. The result is unhappy employees and lower productivity.",
            details: ["-250 CAP", "-$25K COSTS (Savings)"],
            effects: [{ kpi: 'capacity', change_value: -250, timing: 'immediate', description: 'Productivity dip from cuts' }, { kpi: 'cost', change_value: -25000, timing: 'immediate', description: 'Cost Cutting Savings' }] },
        { id: 'ch2_conseq_d', challenge_option_id: 'D', narrative_text: "The new tax will decrease your profits at the end of the round by increasing your costs.",
            details: ["+$50K COSTS (New Tax)"],
            effects: [{ kpi: 'cost', change_value: 50000, timing: 'immediate', description: 'New Tax Cost Incurred' }] },
    ],
    'ch3-conseq': [
        {
            id: 'ch3_conseq_a', challenge_option_id: 'A',
            narrative_text: "You successfully reduced your workforce and CAP in the future. You’ve permanently impacted your KPIs. HR Managers, come to the facilitator desk to pick up a KPI Adjustment Card.",
            details: ["-1250 Current CAP", "-$300K Current Costs", "Permanent KPI Card: -1000 Capacity (Future - from spreadsheet)"],
            effects: [
                { kpi: 'cost', change_value: -300000, timing: 'immediate', description: "Layoff Savings" },
                { kpi: 'capacity', change_value: -1250, timing: 'immediate', description: "Immediate Capacity Reduction from Layoffs" },
                { kpi: 'capacity', change_value: -1000, timing: 'permanent_next_round_start', applies_to_rounds: [2,3], description:"Permanent Capacity Reduction from Layoffs"} // Per spreadsheet
            ],
            impact_card_image_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FKPI_Impact_Cards%2FPerm_KPI_Card_Layoff.jpg?alt=media"
        },
        {
            id: 'ch3_conseq_b', challenge_option_id: 'B',
            narrative_text: "You successfully furloughed workers for the year to save costs and will get them back next year.",
            details: ["-1000 Current CAP", "-$200K Current Costs"],
            effects: [
                { kpi: 'cost', change_value: -200000, timing: 'immediate', description: "Furlough Savings" },
                { kpi: 'capacity', change_value: -1000, timing: 'immediate', description: "Capacity Reduction from Furlough" }
                // Assumption: Capacity returns next round unless a permanent card is issued.
            ]
        },
        {
            id: 'ch3_conseq_c', challenge_option_id: 'C',
            narrative_text: "You maintained your current headcount and cut overtime and temp workers.",
            details: ["-500 Current CAP", "-$100K Current Costs"],
            effects: [
                { kpi: 'cost', change_value: -100000, timing: 'immediate', description: "OT/Temp Cuts Savings" },
                { kpi: 'capacity', change_value: -500, timing: 'immediate', description: "Capacity Reduction from OT/Temp Cuts" }
            ]
        },
        {
            id: 'ch3_conseq_d', challenge_option_id: 'D',
            narrative_text: "By not addressing the cashflow crisis, you’re not able to make payroll and have been late paying vendors. Some employees have quit. Morale is low. Both reduce capacity. In addition, legal and admin costs erase any cost savings you realized from the employees who quit.",
            details: ["-1000 Current CAP (from quits/morale)", "+$25K Current Costs (net from admin fees)"], // From spreadsheet
            effects: [
                { kpi: 'capacity', change_value: -1000, timing: 'immediate', description: "Recession - Quits and low morale" },
                { kpi: 'cost', change_value: 25000, timing: 'immediate', description: "Recession - Admin/Legal fees, no net savings" }
            ]
        },
    ],
};

export const masterInvestmentPayoffs: Record<string, InvestmentPayoff[]> = {
    'rd1-payoff': [
        { id: 'payoff_rd1_inv_biz_growth', investment_option_id: 'rd1_inv_biz_growth', name: "#1 Biz Growth Strat.", effects: [
                { kpi: 'capacity', change_value: 250, timing: 'immediate', description: "Biz Growth Capacity Boost" },
                { kpi: 'orders', change_value: 250, timing: 'immediate', description: "Biz Growth Order Increase" },
                { kpi: 'asp', change_value: 20, timing: 'immediate', description: "Biz Growth ASP Increase" }
            ]},
        { id: 'payoff_rd1_inv_prod_effic', investment_option_id: 'rd1_inv_prod_effic', name: "#2 Prod. Efficiency", effects: [
                { kpi: 'capacity', change_value: 1500, timing: 'immediate', description: "Prod Efficiency Capacity Boost" }
            ]},
        { id: 'payoff_rd1_inv_2nd_shift', investment_option_id: 'rd1_inv_2nd_shift', name: "#3 Add 2nd Shift", effects: [
                { kpi: 'capacity', change_value: 1500, timing: 'immediate', description: "2nd Shift Capacity" },
                { kpi: 'cost', change_value: 300000, timing: 'immediate', description: "2nd Shift Operating Costs" }
            ]},
        { id: 'payoff_rd1_inv_sup_chain', investment_option_id: 'rd1_inv_sup_chain', name: "#4 Supply Chain Opt.", effects: [
                { kpi: 'capacity', change_value: 250, timing: 'immediate', description: "Supply Chain Capacity Boost" },
                { kpi: 'cost', change_value: -100000, timing: 'immediate', description: "Supply Chain Cost Savings" }
            ]},
        { id: 'payoff_rd1_inv_emp_dev', investment_option_id: 'rd1_inv_emp_dev', name: "#5 Employee Dev.", effects: [
                { kpi: 'capacity', change_value: 250, timing: 'immediate', description: "Emp Dev Capacity Boost" },
                { kpi: 'cost', change_value: -25000, timing: 'immediate', description: "Emp Dev Cost Savings" }
            ]},
        { id: 'payoff_rd1_inv_boutique', investment_option_id: 'rd1_inv_boutique', name: "#6 Maximize Sales (Boutique)", effects: [
                { kpi: 'orders', change_value: 500, timing: 'immediate', description: "Boutique Order Increase" },
                { kpi: 'asp', change_value: 20, timing: 'immediate', description: "Boutique ASP Increase" }
            ]},
    ],
    'rd2-payoff': [ /* Populate based on RD2 Invest tab in spreadsheet */ ],
    'rd3-payoff': [ /* Populate based on RD3 Invest tab in spreadsheet */ ],
    'dd-payoff': [ /* This will be more complex, based on dice roll and chosen DD investment */ ],
};

export const readyOrNotGame_2_0_DD: GameStructure = {
    id: "ready_or_not_2.0_dd",
    name: "Ready Or Not 2.0 (with Double Down)",
    welcome_phases: gamePhases_Welcome,
    rounds: [
        { id: "round1", name: "Round 1: Years 1 & 2", year_label: "Years 1 & 2", phases: gamePhases_Round1 },
        { id: "round2", name: "Round 2: Years 3 & 4", year_label: "Years 3 & 4", phases: gamePhases_Round2 },
        { id: "round3", name: "Round 3: Year 5", year_label: "Year 5", phases: gamePhases_Round3 },
    ],
    game_end_phases: gamePhases_End,
    slides: masterSlides,
    all_investment_options: masterInvestmentOptions,
    all_challenge_options: masterChallengeOptions,
    investment_phase_budgets: {
        'rd1-invest': 250000,
        'rd2-invest': 500000, // From spreadsheet "Budget" for Round 2
        'rd3-invest': 600000, // From spreadsheet "Budget" for Round 3
    },
    all_consequences: masterConsequences,
    all_investment_payoffs: masterInvestmentPayoffs,
    allPhases: [
        ...gamePhases_Welcome,
        ...gamePhases_Round1,
        ...gamePhases_Round2,
        ...gamePhases_Round3,
        ...gamePhases_End,
    ]
};