// src/data/gameStructure/round1/slides.ts
import {Slide} from '../../../types';

export const round1Slides: Slide[] = [
    { // This is Slide 7
        id: 7,
        title: "RD-1 Investment Decision Period",
        type: 'interactive_invest',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_008.mp4?alt=media", // 15-min timer video
        interactive_data_key: 'rd1-invest',
        main_text: "RD-1 INVEST: TIMER ACTIVE",
        sub_text: "Make all investment decisions on your team device before the video ends.",
        auto_advance_after_video: false, // Alert will handle progression
        background_css: 'bg-slate-800',
        teacher_alert: { // REQ-2.12 (timer end version is the default for this slide)
            title: "Investment Period Complete",
            message: "Before proceeding, please confirm that all teams have finalized and submitted their investment decisions. Once verified, click 'Next' to continue to the next phase."
        }
    },
    {
        id: 8,
        title: "Overview: Years 1 & 2",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_009.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 9,
        title: "Start Year 1",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_010.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 10,
        title: "Impact Event #1: Overview",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_011.mp4?alt=media",
        auto_advance_after_video: true,
    },
    {
        id: 11,
        title: "Impact Event #1: The Setup",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_012.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 12,
        title: "Impact Event #1: Option A",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_013.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 13,
        title: "Impact Event #1: Option B",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_014.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 14,
        title: "Impact Event #1: Option C",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_015.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 15,
        title: "Impact Event #1: Option D",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_016.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 16,
        title: "Team Phone Guru Instructions",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_017.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 17,
        title: "CH1: Machinery Failure - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch1',
        main_text: "Challenge #1: MACHINERY FAILURE",
        sub_text: "Teams: Discuss and select your response using your team device. Timer is on screen.",
        timer_duration_seconds: 3 * 60,
        background_css: 'bg-orange-800',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_018.mp4?alt=media",
        teacher_alert: { // This is a slide-defined alert
            title: "Choice 1 Closed",
            message: "All teams submitted or time is up. Click OK to see consequences."
        }
    },
    {
        id: 18,
        title: "Impact Event #1: Options Summary Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_019.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 19,
        title: "Consequences Overview Video Choice 1",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_020.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 20,
        title: "Choice 1 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A: Purchase CNC Machine",
        sub_text: "Initial Impact: -250 Capacity, +$50k Costs. Long-term: Permanent KPI Card for +500 Capacity in future rounds.",
        details: ["-250 Current Capacity", "+$50k Current Costs", "Permanent KPI Card: +500 Capacity (Future Rounds)"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_021.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 21,
        title: "Choice 1 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B: Replacement Die Cast",
        sub_text: "Quick installation, minimal disruption. Initial Impact: +$25k Costs.",
        details: ["-250 Current Capacity (from spreadsheet 'Equip Fail Event')", "+$25k Current Costs"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_022.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 22,
        title: "Choice 1 Consequences: Option C Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C: Outsource Fins",
        sub_text: "Flexible capacity, lower initial costs, but less control. Initial Impact: +250 Capacity (net gain), +$25k Costs.",
        details: ["+250 Current Capacity (compared to doing nothing/broken state)", "+$25k Current Costs"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_023.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 23,
        title: "Choice 1 Consequences: Option D Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D: Do Nothing",
        sub_text: "Production slowdowns, increased repairs, and cancelled orders. Initial Impact: -500 Capacity, +$75k Costs, -200 Orders.",
        details: ["-500 Current Capacity", "+$75k Current Costs", "-200 Current Orders (from spreadsheet)"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_024.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 24,
        title: "Choice 1 Career Insight Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_025.mp4?alt=media",
        auto_advance_after_video: true,
    },
    {
        id: 25,
        title: "Choice 1 Transition Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_026.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 26,
        title: "Impact Event #2: Overview",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_027.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 27,
        title: "Impact Event #2: Setup Video (New Tax)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_028.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 28,
        title: "Impact Event #2: Option A Video (Raise Prices)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_029.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 29,
        title: "Impact Event #2: Option B Video (Increase Marketing)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_030.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 30,
        title: "Impact Event #2: Option C Video (Cost Cutting)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_031.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 31,
        title: "Impact Event #2: Option D Video (Do Nothing)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_032.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 32,
        title: "CH2: New Tax - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch2',
        main_text: "Challenge #2: NEW TAX",
        sub_text: "Teams: Discuss and select your response using your team device. Timer is on screen.",
        timer_duration_seconds: 3 * 60,
        background_css: 'bg-indigo-800',
        teacher_alert: { // Slide-defined alert
            title: "Choice 2 Closed",
            message: "All teams submitted or time is up. Click OK to see consequences."
        }
    },
    {
        id: 33,
        title: "Impact Event #2: Options Summary Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_034.mp4?alt=media",
        auto_advance_after_video: false // Should be true if it just leads to consequences
    },
    {
        id: 34,
        title: "Consequences Overview Video CH2",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_035.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 35,
        title: "CH2 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A (Raise Prices)",
        sub_text: "ASP increases by $20. Demand stable.",
        details: ["+$20 ASP", "-250 Orders (per spreadsheet)"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_036.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 36,
        title: "CH2 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B (Increase Marketing)",
        sub_text: "Orders increase by 500, Marketing Costs increase by $25k.",
        details: ["+500 Orders", "+$25k Costs"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_037.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 37,
        title: "CH2 Consequences: Option C Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C (Cost Cutting)",
        sub_text: "Costs decrease by $25k, but Capacity drops by 250 due to morale/service cuts.",
        details: ["-250 Capacity", "-$25k Costs"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_038.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 38,
        title: "CH2 Consequences: Option D Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D (Do Nothing - New Tax)",
        sub_text: "Operational costs increase by $50k due to absorbing the new tax.",
        details: ["+$50k Costs (New Tax)"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_039.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 39,
        title: "CH2 Career Insight Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_040.mp4?alt=media",
        auto_advance_after_video: false, // Pause for teacher
        teacher_alert: {title: "Impact Event #2 Complete", message: "Prepare for Impact Event #3. Click OK to proceed."}
    },
    {
        id: 40,
        title: "Transition to later in Year 2 Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_041.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 41,
        title: "News Broadcast Video (Mid Year 2 - Recession)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_042.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 42,
        title: "Impact Event #3: Setup Video (Recession)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_043.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 43,
        title: "Impact Event #3: Option A Video (Layoffs)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_044.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 44,
        title: "Impact Event #3: Option B Video (Furlough/Workshare)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_045.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 45,
        title: "Impact Event #3: Option C Video (Maintain/Cut OT)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_046.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 46,
        title: "Impact Event #3: Option D Video (Do Nothing)",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_047.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 47,
        title: "CH3: Recession - Make Your Choice",
        type: 'interactive_choice',
        interactive_data_key: 'ch3',
        main_text: "Challenge #3: RECESSION",
        sub_text: "Teams: Discuss and select your response using your team device. Timer is on screen.",
        timer_duration_seconds: 3 * 60,
        background_css: 'bg-teal-800',
        teacher_alert: { // Slide-defined alert
            title: "Choice 3 Closed",
            message: "All teams submitted or time is up. Click OK to see consequences."
        }
    },
    {
        id: 48,
        title: "Impact Event #3: Options Summary Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_049.mp4?alt=media",
        auto_advance_after_video: false // Should be true
    },
    {
        id: 49,
        title: "Consequences Overview Video CH3",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_050.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 50,
        title: "CH3 Consequences: Option A Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option A (Layoffs)",
        sub_text: "Significant cost reduction and capacity decrease. Future capacity also impacted.",
        details: ["-1250 Current Capacity", "-$300k Current Costs", "Permanent KPI Card: -1000 Capacity (Future - per spreadsheet)"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_051.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 51,
        title: "CH3 Consequences: Option B Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option B (Furlough/Workshare)",
        sub_text: "Reduces costs and capacity, but less severely than full layoffs.",
        details: ["-1000 Current Capacity", "-$200k Current Costs"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_052.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 52,
        title: "CH3 Consequences: Option C Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option C (Maintain/Cut OT)",
        sub_text: "Moderate cost savings with a smaller capacity hit.",
        details: ["-500 Current Capacity", "-$100k Current Costs"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_053.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 53,
        title: "CH3 Consequences: Option D Details",
        type: 'consequence_reveal',
        main_text: "Consequence for Option D (Do Nothing - Recession)",
        sub_text: "Demand drops significantly, and unchanged fixed costs hurt margins. Morale issues reduce capacity.",
        details: ["-1000 Current Orders (Demand Drop)", "-1000 Current Capacity (Morale/Quits)", "+$25k Current Costs (Inefficiency/Admin)"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_054.mp4?alt=media',
        background_css: 'bg-gray-700'
    },
    {
        id: 54,
        title: "CH3 Career Insight Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_055.mp4?alt=media",
        auto_advance_after_video: false, // Pause for teacher
        teacher_alert: { // Slide-defined alert
            title: "Impact Event #3 Complete",
            message: "Prepare for RD-1 Investment Payoffs. Click OK to proceed."
        }
    },
    {
        id: 55,
        title: "RD-1 Investment Payoff Intro Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_056.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 56,
        title: "Payoff: #1 Biz Growth Strategy",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Business Growth Strategy",
        sub_text: "Impact: Capacity: +250, Orders: +250, ASP: +$20",
        details: ["+250 Capacity", "+250 Orders", "+$20 ASP"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_057.mp4?alt=media'
    },
    {
        id: 57,
        title: "Payoff: #2 Production Efficiency",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Production Efficiency",
        sub_text: "Impact: Capacity: +1500",
        details: ["+1500 Capacity"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_058.mp4?alt=media'
    },
    {
        id: 58,
        title: "Payoff: #3 Add 2nd Shift",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Add 2nd Shift",
        sub_text: "Impact: Capacity: +1500, Costs: +$300k",
        details: ["+1500 Capacity", "+$300k Costs"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_059.mp4?alt=media'
    },
    {
        id: 59,
        title: "Payoff: #4 Supply Chain Optimization",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Supply Chain Optimization",
        sub_text: "Impact: Capacity: +250, Costs: -$100k",
        details: ["+250 Capacity", "-$100k Costs"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_060.mp4?alt=media'
    },
    {
        id: 60,
        title: "Payoff: #5 Employee Development",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Employee Development",
        sub_text: "Impact: Capacity: +250, Costs: -$25k",
        details: ["+250 Capacity", "-$25k Costs"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_061.mp4?alt=media'
    },
    {
        id: 61,
        title: "Payoff: #6 Maximize Sales (Boutique)",
        type: 'payoff_reveal',
        main_text: "RD-1 Payoff: Maximize Sales (Boutique)",
        sub_text: "Impact: Orders: +500, ASP: +$20",
        details: ["+500 Orders", "+$20 ASP"],
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_062.mp4?alt=media',
        teacher_alert: { // Slide-defined alert
            title: "RD-1 Payoffs Complete",
            message: "All investment payoffs for Round 1 have been revealed. Click OK to review End of Round KPIs."
        }
    },
    {
        id: 62,
        title: "End of Round 1 KPIs",
        type: 'kpi_summary_instructional',
        main_text: "END OF ROUND 1 KPIs",
        sub_text: "CFOs: Review your team's final KPIs on your device and record them on your Team Summary Sheet. The facilitator will display the leaderboard next.",
        source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_063.mp4?alt=media',
        teacher_alert: { // Slide-defined alert
            title: "KPI Review",
            message: "Ensure teams have reviewed their KPIs. Click OK to display the Leaderboard."
        }
    },
    {
        id: 63,
        title: "RD-1 Leaderboard Intro Video",
        type: 'video',
        source_url: "https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_064.mp4?alt=media",
        auto_advance_after_video: true
    },
    {
        id: 63.1,
        title: "Leaderboard: RD-1 Capacity & Orders",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_cap_ord',
        main_text: "RD-1 Leaderboard: Capacity & Orders",
        sub_text: "Team comparison of production capability and market demand generated."
    },
    {
        id: 63.2,
        title: "Leaderboard: RD-1 Cost Per Board",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_cpb',
        main_text: "RD-1 Leaderboard: Cost Per Board",
        sub_text: "Comparing efficiency in production costs among teams."
    },
    {
        id: 63.3,
        title: "Leaderboard: RD-1 Total Costs",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_costs',
        main_text: "RD-1 Leaderboard: Total Operational Costs",
        sub_text: "Overall spending by each team in Round 1."
    },
    {
        id: 63.4,
        title: "Leaderboard: RD-1 ASP",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_asp',
        main_text: "RD-1 Leaderboard: Average Selling Price (ASP)",
        sub_text: "Team pricing power and strategy in the market."
    },
    {
        id: 63.5,
        title: "Leaderboard: RD-1 Revenue",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_revenue',
        main_text: "RD-1 Leaderboard: Total Revenue",
        sub_text: "Comparing total income generated from sales."
    },
    {
        id: 63.6,
        title: "Leaderboard: RD-1 Net Margin",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_margin',
        main_text: "RD-1 Leaderboard: Net Profit Margin",
        sub_text: "Profitability as a percentage of revenue for each team."
    },
    {
        id: 63.7,
        title: "Leaderboard: RD-1 Net Income (RANKED)",
        type: 'leaderboard_chart',
        interactive_data_key: 'rd1_leaderboard_income',
        main_text: "RD-1 Leaderboard: Net Income (Overall Ranking)",
        sub_text: "Final profit ranking for Round 1. Click OK to proceed to Round 2 setup.",
        teacher_alert: { // Slide-defined alert
            title: "Round 1 Complete!",
            message: "Round 1 is concluded. Click OK to prepare for Round 2."
        }
    },
];