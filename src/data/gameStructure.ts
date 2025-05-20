// src/data/gameStructure.ts
import { GameStructure, Slide, GamePhaseNode, GameRound, InvestmentOption, ChallengeOption, Consequence, InvestmentPayoff, KpiEffect } from '../types';
import {
    PlayCircle, DollarSign, ListChecks, AlertTriangle, TrendingUp, BarChart3, Trophy, Settings2, Repeat, Info, Video, Zap, Users, FileText, Flag, Maximize, Minimize, HelpCircle, HandCoins
} from 'lucide-react'; // Importing all potentially used icons

// --- MASTER SLIDE DATA ---
// (Populated based on your detailed slide list for Round 1, placeholders for others)
export const masterSlides: Slide[] = [
    // --- Welcome & Setup Slides (Slides 0-5 from your list) ---
    { id: 0, title: "Welcome", type: 'image', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_001.jpg?alt=media', background_css: 'bg-gray-900' },
    { id: 1, title: "Table Setup 1", type: 'image', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_002.jpg?alt=media', background_css: 'bg-gray-200' },
    { id: 2, title: "Table Setup 2", type: 'image', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_003.jpg?alt=media', background_css: 'bg-gray-200' },
    { id: 3, title: "Ready Or Not 2.0", type: 'image', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_004.jpg?alt=media', background_css: 'bg-green-700' },
    { id: 4, title: "Game Introduction Video", type: 'video', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_005.mp4?alt=media', auto_advance_after_video: true },
    { id: 5, title: "Let's Get It On!", type: 'video', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_006.mp4?alt=media', auto_advance_after_video: false, teacher_alert: { title: "Student Activity", message: "Teams will now make their RD-1 Investments. Monitor their progress." } },

    // --- Round 1 Invest (Slides 6-10) ---
    { id: 6, title: "RD-1 Investments Overview", type: 'video', source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_007.mp4?alt=media', auto_advance_after_video: true },
    { id: 7, title: "RD-1 Invest: Make Your Decisions", type: 'interactive_invest', interactive_data_key: 'rd1_invest_options', main_text: "RD-1 INVEST", sub_text: "Teams: Make your investment decisions on your app.", timer_duration_seconds: 15 * 60, background_css: 'bg-slate-800', teacher_alert: { title: "RD-1 Investments Closed", message: "All teams submitted or time is up. Click Next to proceed to Year 1." } }, // 15 min timer
    { id: 8, title: "RD-1 Intro: Years 1 & 2", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 9, title: "RD-1 Intro: Year 1", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 10, title: "ALU Factory Animation", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: false, teacher_alert: { title: "Impact Event #1", message: "Prepare for Impact Event #1: Machinery Failure."} },

    // --- Round 1 Choice 1 (Machinery Failure - Slides 11-18) ---
    { id: 11, title: "Impact Event #1: The Setup", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 12, title: "Impact Event #1: Option A", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 13, title: "Impact Event #1: Option B", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 14, title: "Impact Event #1: Option C", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 15, title: "Impact Event #1: Option D", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 16, title: "Team Phone Guru (TPG) Instructions", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 17, title: "CH1: Machinery Failure - Make Your Choice", type: 'interactive_choice', interactive_data_key: 'ch1_options', main_text: "Challenge #1: MACHINERY FAILURE", sub_text: "Teams: Discuss and select your response.", timer_duration_seconds: 3 * 60, background_css: 'bg-orange-800', teacher_alert: { title: "Choice 1 Closed", message: "All teams submitted or time is up. Click Next to see consequences."} }, // 3 min timer
    { id: 18, title: "Impact Event #1: Options Summary", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: false }, // This was "slide 17 part 2"

    // --- Round 1 Choice 1 Consequences (Slides 19-24) ---
    { id: 19, title: "Consequences Overview", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 20, title: "CH1 Consequences: Option A", type: 'consequence_reveal', main_text: "Consequence for Option A...", background_css: 'bg-red-200', source_url: 'firebase_url_for_ch1_consequence_a_image_or_video.mp4' /* or .jpg */ },
    { id: 21, title: "CH1 Consequences: Option B", type: 'consequence_reveal', main_text: "Consequence for Option B...", background_css: 'bg-yellow-200', source_url: 'firebase_url_for_ch1_consequence_b_image_or_video.mp4' },
    { id: 22, title: "CH1 Consequences: Option C", type: 'consequence_reveal', main_text: "Consequence for Option C...", background_css: 'bg-green-200', source_url: 'firebase_url_for_ch1_consequence_c_image_or_video.mp4' },
    { id: 23, title: "CH1 Consequences: Option D", type: 'consequence_reveal', main_text: "Consequence for Option D...", background_css: 'bg-blue-200', source_url: 'firebase_url_for_ch1_consequence_d_image_or_video.mp4' },
    { id: 24, title: "CH1 Career Insight", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: false, teacher_alert: { title: "Year 1 Complete", message: "Prepare for Impact Event #2."}},

    // --- Round 1 Choice 2 (New Tax - Slides 25-33) ---
    { id: 25, title: "Transition to Year 2", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true }, // "Rd 1 year 1 video" in your list, assuming it's a transition
    { id: 26, title: "News Broadcast (Year 2 Start)", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 27, title: "Impact Event #2: The Setup (New Tax)", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 28, title: "Impact Event #2: Option A", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 29, title: "Impact Event #2: Option B", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 30, title: "Impact Event #2: Option C", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 31, title: "Impact Event #2: Option D", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 32, title: "CH2: New Tax - Make Your Choice", type: 'interactive_choice', interactive_data_key: 'ch2_options', main_text: "Challenge #2: NEW TAX", sub_text: "Teams: Discuss and select your response.", timer_duration_seconds: 3 * 60, background_css: 'bg-indigo-800', teacher_alert: { title: "Choice 2 Closed", message: "All teams submitted or time is up. Click Next to see consequences."} },
    { id: 33, title: "Impact Event #2: Options Summary", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: false },

    // --- Round 1 Choice 2 Consequences (Slides 34-39) ---
    { id: 34, title: "Consequences Overview", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 35, title: "CH2 Consequences: Option A", type: 'consequence_reveal', main_text: "Consequence for Option A...", source_url: 'your_ch2_consequence_a_image_or_video.mp4' },
    { id: 36, title: "CH2 Consequences: Option B", type: 'consequence_reveal', main_text: "Consequence for Option B...", source_url: 'your_ch2_consequence_b_image_or_video.mp4' },
    { id: 37, title: "CH2 Consequences: Option C", type: 'consequence_reveal', main_text: "Consequence for Option C...", source_url: 'your_ch2_consequence_c_image_or_video.mp4' },
    { id: 38, title: "CH2 Consequences: Option D", type: 'consequence_reveal', main_text: "Consequence for Option D...", source_url: 'your_ch2_consequence_d_image_or_video.mp4' },
    { id: 39, title: "CH2 Career Insight", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: false, teacher_alert: { title: "Impact Event #2 Complete", message: "Prepare for Impact Event #3."} },

    // --- Round 1 Choice 3 (Recession - Slides 40-48) ---
    { id: 40, title: "Transition to later in Year 2", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true }, // "Rd 1 year 2 video"
    { id: 41, title: "News Broadcast (Mid Year 2)", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 42, title: "Impact Event #3: The Setup (Recession)", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 43, title: "Impact Event #3: Option A", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 44, title: "Impact Event #3: Option B", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 45, title: "Impact Event #3: Option C", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 46, title: "Impact Event #3: Option D", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 47, title: "CH3: Recession - Make Your Choice", type: 'interactive_choice', interactive_data_key: 'ch3_options', main_text: "Challenge #3: RECESSION", sub_text: "Teams: Discuss and select your response.", timer_duration_seconds: 3 * 60, background_css: 'bg-teal-800', teacher_alert: { title: "Choice 3 Closed", message: "All teams submitted or time is up. Click Next to see consequences."} },
    { id: 48, title: "Impact Event #3: Options Summary", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: false },

    // --- Round 1 Choice 3 Consequences (Slides 49-54) ---
    { id: 49, title: "Consequences Overview", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 50, title: "CH3 Consequences: Option A", type: 'consequence_reveal', main_text: "Consequence for Option A...", source_url: 'your_ch3_consequence_a_image_or_video.mp4' },
    { id: 51, title: "CH3 Consequences: Option B", type: 'consequence_reveal', main_text: "Consequence for Option B...", source_url: 'your_ch3_consequence_b_image_or_video.mp4' },
    { id: 52, title: "CH3 Consequences: Option C", type: 'consequence_reveal', main_text: "Consequence for Option C...", source_url: 'your_ch3_consequence_c_image_or_video.mp4' },
    { id: 53, title: "CH3 Consequences: Option D", type: 'consequence_reveal', main_text: "Consequence for Option D...", source_url: 'your_ch3_consequence_d_image_or_video.mp4' },
    { id: 54, title: "CH3 Career Insight", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: false, teacher_alert: { title: "Impact Event #3 Complete", message: "Prepare for RD-1 Investment Payoffs."} },

    // --- Round 1 Investment Payoffs (Slides 55-61) ---
    { id: 55, title: "RD-1 Investment Payoff Intro", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true },
    { id: 56, title: "Payoff: #1 Biz Growth", type: 'payoff_reveal', main_text: "Payoff for Business Growth Strategy", interactive_data_key: 'rd1_payoff_biz_growth', source_url: 'your_payoff_biz_growth_image_or_video.mp4' },
    { id: 57, title: "Payoff: #2 Prod. Efficiency", type: 'payoff_reveal', main_text: "Payoff for Production Efficiency", interactive_data_key: 'rd1_payoff_prod_effic', source_url: 'your_payoff_prod_effic_image_or_video.mp4' },
    { id: 58, title: "Payoff: #3 Add 2nd Shift", type: 'payoff_reveal', main_text: "Payoff for Add 2nd Shift", interactive_data_key: 'rd1_payoff_2nd_shift', source_url: 'your_payoff_2nd_shift_image_or_video.mp4' },
    { id: 59, title: "Payoff: #4 Supply Chain Opt.", type: 'payoff_reveal', main_text: "Payoff for Supply Chain Opt.", interactive_data_key: 'rd1_payoff_sup_chain', source_url: 'your_payoff_sup_chain_image_or_video.mp4' },
    { id: 60, title: "Payoff: #5 Employee Dev.", type: 'payoff_reveal', main_text: "Payoff for Employee Development", interactive_data_key: 'rd1_payoff_emp_dev', source_url: 'your_payoff_emp_dev_image_or_video.mp4' },
    { id: 61, title: "Payoff: #6 Maximize Sales", type: 'payoff_reveal', main_text: "Payoff for Maximize Sales", interactive_data_key: 'rd1_payoff_boutique', source_url: 'your_payoff_boutique_image_or_video.mp4', teacher_alert: { title: "RD-1 Payoffs Complete", message: "Click Next to review End of Round KPIs."} },

    // --- Round 1 End (Slides 62-63) ---
    { id: 62, title: "End of Round 1 KPIs", type: 'kpi_summary_instructional', main_text: "END OF ROUND KPIs", sub_text: "CFO: Write KPIs from board on your team summary sheet. Submit these KPIs to the mobile app.", source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_063.jpg?alt=media', teacher_alert: { title: "KPI Recording", message: "Ensure teams have recorded their KPIs. Click Next to display the Leaderboard."} }, // Your Slide 62 image
    { id: 63, title: "RD-1 Leaderboard Intro", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: true }, // Your Slide 63, assuming it's an intro
    // Individual Leaderboard Metric Slides (conceptual, based on demo cycling)
    { id: 63.1, title: "Leaderboard: Capacity & Orders", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_cap_ord' },
    { id: 63.2, title: "Leaderboard: Cost Per Board", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_cpb' },
    { id: 63.3, title: "Leaderboard: Total Costs", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_costs' },
    { id: 63.4, title: "Leaderboard: ASP", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_asp' },
    { id: 63.5, title: "Leaderboard: Revenue", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_revenue' },
    { id: 63.6, title: "Leaderboard: Net Margin", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_margin' },
    { id: 63.7, title: "Leaderboard: Net Income (RANKED)", type: 'leaderboard_chart', interactive_data_key: 'rd1_leaderboard_income', teacher_alert: {title: "Round 1 Complete!", message: "Prepare for Round 2."} },

    // --- PLACEHOLDERS FOR ROUND 2 & 3 ---
    // These would follow the same pattern: Invest -> Choice(s) -> Consequences -> Payoff -> KPIs -> Leaderboard
    // Example for RD-2 Invest Start
    { id: 100, title: "Round 2 Introduction", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: false, teacher_alert: {title: "Student Activity", message: "Teams will now make RD-2 Investments."} },
    { id: 101, title: "RD-2 Invest: Make Your Decisions", type: 'interactive_invest', interactive_data_key: 'rd2_invest_options', main_text: "RD-2 INVEST", sub_text: "Teams: Make your investment decisions on your app.", timer_duration_seconds: 10 * 60, background_css: 'bg-slate-800', teacher_alert: { title: "RD-2 Investments Closed", message: "All teams submitted or time is up." } },
    // ... many more slides for RD-2 choices, consequences, payoffs, KPIs, leaderboard
    // Example for RD-3 Invest Start
    { id: 200, title: "Round 3 Introduction", type: 'video', source_url: "placeholder_video_url.mp4", auto_advance_after_video: false, teacher_alert: {title: "Student Activity", message: "Teams will now make RD-3 Investments."} },
    { id: 201, title: "RD-3 Invest: Make Your Decisions", type: 'interactive_invest', interactive_data_key: 'rd3_invest_options', main_text: "RD-3 INVEST", sub_text: "Teams: Make your investment decisions on your app.", timer_duration_seconds: 10 * 60, background_css: 'bg-slate-800', teacher_alert: { title: "RD-3 Investments Closed", message: "All teams submitted or time is up." } },
    // Double Down Prompt
    { id: 202, title: "Double Down Opportunity", type: 'interactive_double_down_prompt', main_text: "DOUBLE DOWN!", sub_text: "Teams: Decide if you want to double down on an RD-3 investment.", timer_duration_seconds: 5 * 60, background_css: 'bg-red-700', teacher_alert: { title: "Double Down Decision Closed", message: "Teams have decided. Click Next for selections if applicable, or to Choice 8." } },
    // Double Down Selection (if chosen) - this might be a conditional slide or part of the prompt logic
    { id: 203, title: "Select Double Down", type: 'interactive_double_down_select', main_text: "Choose Your Double Down", sub_text: "Select one RD-3 investment to sacrifice, and one to double down on.", background_css: 'bg-red-700', teacher_alert: { title: "Double Down Selections Made", message: "Click Next to proceed to Choice 8." } },
    // ... CH8, CH9, consequences, RD-3 Payoffs, Double Down Payoff, KPIs, Final Leaderboard
    { id: 300, title: "Game Over - Final Results", type: 'game_end_summary', main_text: "THANKS FOR PLAYING!", source_url: 'https://firebasestorage.googleapis.com/v0/b/ron-2-b9828.firebasestorage.app/o/academia%2FSlide_197.jpg?alt=media' }
];

// --- MASTER GAME PHASE NODE DATA (for Journey Map) ---
const gamePhases_Welcome: GamePhaseNode[] = [
    { id: 'welcome-intro', label: "WELCOME", sub_label: "Start Here", icon_name: 'PlayCircle', phase_type: 'welcome', round_number: 0, slide_ids: [0,1,2,3], is_interactive_student_phase: false },
    { id: 'game-intro-video', label: "GAME INTRO", icon_name: 'Film', phase_type: 'narration', round_number: 0, slide_ids: [4,5], is_interactive_student_phase: false, expected_duration_minutes: 2 }, // Approx based on video lengths
];

const gamePhases_Round1: GamePhaseNode[] = [
    { id: 'rd1-invest', label: "RD-1 INVEST", sub_label: "Years 1&2", icon_name: 'DollarSign', phase_type: 'invest', round_number: 1, slide_ids: [6, 7, 8, 9, 10], is_interactive_student_phase: true, expected_duration_minutes: 15 },
    { id: 'ch1', label: "CHOICE 1", sub_label: "Machinery", icon_name: 'ListChecks', phase_type: 'choice', round_number: 1, slide_ids: [11,12,13,14,15,16,17,18], is_interactive_student_phase: true, expected_duration_minutes: 3 },
    { id: 'ch1-conseq', label: "CONSEQ.", sub_label: "CH1", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 1, slide_ids: [19,20,21,22,23,24], is_interactive_student_phase: false },
    { id: 'ch2', label: "CHOICE 2", sub_label: "New Tax", icon_name: 'ListChecks', phase_type: 'choice', round_number: 1, slide_ids: [25,26,27,28,29,30,31,32,33], is_interactive_student_phase: true, expected_duration_minutes: 3 },
    { id: 'ch2-conseq', label: "CONSEQ.", sub_label: "CH2", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 1, slide_ids: [34,35,36,37,38,39], is_interactive_student_phase: false },
    { id: 'ch3', label: "CHOICE 3", sub_label: "Recession", icon_name: 'ListChecks', phase_type: 'choice', round_number: 1, slide_ids: [40,41,42,43,44,45,46,47,48], is_interactive_student_phase: true, expected_duration_minutes: 3 },
    { id: 'ch3-conseq', label: "CONSEQ.", sub_label: "CH3", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 1, slide_ids: [49,50,51,52,53,54], is_interactive_student_phase: false },
    { id: 'rd1-payoff', label: "RD-1 PAYOFF", icon_name: 'TrendingUp', phase_type: 'payoff', round_number: 1, slide_ids: [55,56,57,58,59,60,61], is_interactive_student_phase: false },
    { id: 'rd1-kpi', label: "RD-1 KPIs", icon_name: 'BarChart3', phase_type: 'kpi', round_number: 1, slide_ids: [62], is_interactive_student_phase: false },
    { id: 'rd1-leaderboard', label: "LEADERBOARD", icon_name: 'Trophy', phase_type: 'leaderboard', round_number: 1, slide_ids: [63, 63.1, 63.2, 63.3, 63.4, 63.5, 63.6, 63.7], is_interactive_student_phase: false },
];

// Placeholder for Round 2 Phases
const gamePhases_Round2: GamePhaseNode[] = [
    { id: 'rd2-invest', label: "RD-2 INVEST", sub_label: "Years 3&4", icon_name: 'DollarSign', phase_type: 'invest', round_number: 2, slide_ids: [100, 101 /* ...more slides */], is_interactive_student_phase: true, expected_duration_minutes: 10 },
    { id: 'ch4', label: "CHOICE 4", icon_name: 'ListChecks', phase_type: 'choice', round_number: 2, slide_ids: [/*...*/], is_interactive_student_phase: true, expected_duration_minutes: 3 },
    { id: 'ch4-conseq', label: "CONSEQ.", sub_label: "CH4", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 2, slide_ids: [/*...*/], is_interactive_student_phase: false },
    // ... CH5, CH6, CH7 and their consequences
    { id: 'rd2-payoff', label: "RD-2 PAYOFF", icon_name: 'TrendingUp', phase_type: 'payoff', round_number: 2, slide_ids: [/*...*/], is_interactive_student_phase: false },
    { id: 'rd2-kpi', label: "RD-2 KPIs", icon_name: 'BarChart3', phase_type: 'kpi', round_number: 2, slide_ids: [/*...*/], is_interactive_student_phase: false },
    { id: 'rd2-leaderboard', label: "LEADERBOARD", icon_name: 'Trophy', phase_type: 'leaderboard', round_number: 2, slide_ids: [/*...*/], is_interactive_student_phase: false },
];

// Placeholder for Round 3 Phases
const gamePhases_Round3: GamePhaseNode[] = [
    { id: 'rd3-invest', label: "RD-3 INVEST", sub_label: "Year 5", icon_name: 'DollarSign', phase_type: 'invest', round_number: 3, slide_ids: [200, 201 /* ...more slides */], is_interactive_student_phase: true, expected_duration_minutes: 10 },
    { id: 'dd-prompt', label: "DOUBLE DOWN", icon_name: 'Repeat', phase_type: 'double-down-prompt', round_number: 3, slide_ids: [202], is_interactive_student_phase: true, expected_duration_minutes: 5 },
    { id: 'dd-select', label: "DD SELECT", icon_name: 'HandCoins', phase_type: 'double-down-select', round_number: 3, slide_ids: [203], is_interactive_student_phase: true, expected_duration_minutes: 0 }, // This is part of the DD time
    { id: 'ch8', label: "CHOICE 8", icon_name: 'ListChecks', phase_type: 'choice', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: true, expected_duration_minutes: 3 },
    { id: 'ch8-conseq', label: "CONSEQ.", sub_label: "CH8", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: false },
    { id: 'ch9', label: "CHOICE 9", icon_name: 'ListChecks', phase_type: 'choice', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: true, expected_duration_minutes: 3 },
    { id: 'ch9-conseq', label: "CONSEQ.", sub_label: "CH9", icon_name: 'AlertTriangle', phase_type: 'consequence', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: false },
    { id: 'rd3-payoff', label: "RD-3 PAYOFF", icon_name: 'TrendingUp', phase_type: 'payoff', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: false },
    { id: 'dd-payoff', label: "DD PAYOFF", icon_name: 'Zap', phase_type: 'double-down-payoff', round_number: 3, slide_ids: [/* dice roll animation, then payoff slide */], is_interactive_student_phase: false },
    { id: 'rd3-kpi', label: "RD-3 KPIs", icon_name: 'BarChart3', phase_type: 'kpi', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: false },
    { id: 'final-leaderboard', label: "FINAL LEADERBOARD", icon_name: 'Trophy', phase_type: 'leaderboard', round_number: 3, slide_ids: [/*...*/], is_interactive_student_phase: false },
];

const gamePhases_End: GamePhaseNode[] = [
    { id: 'game-complete', label: "GAME COMPLETE", icon_name: 'Flag', phase_type: 'game-end', round_number: 3, slide_ids: [300], is_interactive_student_phase: false },
];


// --- MASTER LISTS FOR STUDENT APP OPTIONS ---
export const masterInvestmentOptions: Record<string, InvestmentOption[]> = {
    'rd1-invest': [
        { id: 'rd1_biz_growth', name: "1. Biz Growth", cost: 50000 },
        { id: 'rd1_prod_effic', name: "2. Prod. Effic.", cost: 100000 },
        { id: 'rd1_2nd_shift', name: "3. 2nd Shift", cost: 50000 },
        { id: 'rd1_sup_chain', name: "4. Sup. Chain.", cost: 75000 },
        { id: 'rd1_emp_dev', name: "5. Emp. Dev.", cost: 50000 },
        { id: 'rd1_boutique', name: "6. Boutique", cost: 100000 },
    ],
    'rd2-invest': [ /* Placeholder options for RD-2 */ ],
    'rd3-invest': [ /* Placeholder options for RD-3 */ ],
};

export const masterChallengeOptions: Record<string, ChallengeOption[]> = {
    'ch1': [ // Machinery Failure
        { id: "A", text: "Purchase an automated CNC Machine for making fins. It's more complex than casting, but could make lighter, stronger, more customizable fins and increase your CAP. Estimated COST is $50K.", is_default_choice: false },
        { id: "B", text: "Purchase replacement die casting equipment. Your employees already know how to operate it so it's unlikely to disrupt operations. Estimated COST is $25K.", is_default_choice: false },
        { id: "C", text: "Outsource aluminum fin manufacturing to a local machine shop. This opens the door to customized CNC Machined Fins and CAP flexibility, but reduces direct control over this part of your manufacturing. Estimated COST is $25K.", is_default_choice: false },
        { id: "D", text: "Do nothing.", is_default_choice: true },
    ],
    'ch2': [ // New Tax
        { id: "A", text: "Raise prices 2% to pass the entire tax thru to customers. This would raise ASP by $20, but also push average prices of ALU boards over $1,000.", is_default_choice: false },
        { id: "B", text: "Increase annual marketing budget by $25K to increase demand. If successful, this could result in 500 more Orders each year.", is_default_choice: false },
        { id: "C", text: "Enact cost cutting measures like ending free coffee and snacks, purchasing fewer and lower-cost office supplies, and reducing the frequency of office cleaning and other non-critical services. Estimated savings are $50,000.", is_default_choice: false },
        { id: "D", text: "Do Nothing. Maintain prices and current marketing budget and take the margin hit.", is_default_choice: true },
    ],
    'ch3': [ // Recession
        { id: "A", text: "Lay-off 2 salaried employees, 4 hourly employees and cut overtime and temporary workers to reduce payroll costs. This should reduce COSTS by -$300K and CAP by 1250.", is_default_choice: false },
        { id: "B", text: "Eliminate temp & overtime work, cut salaries by 10% & apply to the State Employment Dept's Workshare Program. This would temporarily cut hourly staff hours by 25% & allow workers to tap into their unemployment benefits while still being employed by ALU. This should reduce COSTS by -$200K and CAP by -1000.", is_default_choice: false },
        { id: "C", text: "Maintain current headcount but cut overtime and temp workers. This should reduce COSTS by -$100K and CAP by -500.", is_default_choice: false },
        { id: "D", text: "Do nothing.", is_default_choice: true },
    ],
    // ... Placeholders for CH4-CH9
};

export const masterConsequences: Record<string, Consequence[]> = {
    'ch1-conseq': [
        {
            id: 'ch1_conseq_a', challenge_option_id: 'A', narrative_text: "The complex CNC machine takes longer than expected...",
            effects: [
                { kpi: 'capacity', change_value: -250, timing: 'immediate' },
                { kpi: 'cost', change_value: 50000, timing: 'immediate' },
                { kpi: 'capacity', change_value: 500, timing: 'permanent_next_round_start', applies_to_rounds: [2,3], description: 'CNC Machine Bonus' }
            ],
            impact_card_image_url: 'url_to_permanent_kpi_impact_cnc_card.jpg' // From your slide
        },
        { id: 'ch1_conseq_b', challenge_option_id: 'B', narrative_text: "Replacement equipment is easy to operate...", effects: [{ kpi: 'capacity', change_value: -250, timing: 'immediate' }, { kpi: 'cost', change_value: 50000, timing: 'immediate' }] },
        { id: 'ch1_conseq_c', challenge_option_id: 'C', narrative_text: "Aluminum fins aren't rocket science...", effects: [{ kpi: 'capacity', change_value: 250, timing: 'immediate' }, { kpi: 'cost', change_value: 25000, timing: 'immediate' }] },
        { id: 'ch1_conseq_d', challenge_option_id: 'D', narrative_text: "Your hemming and hawing have caused...", effects: [{ kpi: 'capacity', change_value: -500, timing: 'immediate' }, { kpi: 'cost', change_value: 75000, timing: 'immediate' }, { kpi: 'orders', change_value: -200, timing: 'immediate', description: 'Cancelled orders due to delay' }] }, // Assuming some order impact
    ],
    'ch2-conseq': [
        { id: 'ch2_conseq_a', challenge_option_id: 'A', narrative_text: "Your ASP increase builds some additional profits...", effects: [{ kpi: 'asp', change_value: 20, timing: 'immediate' }] },
        { id: 'ch2_conseq_b', challenge_option_id: 'B', narrative_text: "Your marketing efforts pay off...", effects: [{ kpi: 'orders', change_value: 500, timing: 'immediate' }, { kpi: 'cost', change_value: 25000, timing: 'immediate' }] },
        { id: 'ch2_conseq_c', challenge_option_id: 'C', narrative_text: "You found some savings, but cost cutting didn't work...", effects: [{ kpi: 'capacity', change_value: -250, timing: 'immediate' }, { kpi: 'cost', change_value: -25000, timing: 'immediate' }] },
        { id: 'ch2_conseq_d', challenge_option_id: 'D', narrative_text: "The new tax will decrease your profits...", effects: [{ kpi: 'net_income', change_value: -50000, timing: 'end_of_round_adjustment', description: 'Tax Impact on Profit (Do Nothing)' }] }, // Example value
    ],
    'ch3-conseq': [
        {
            id: 'ch3_conseq_a', challenge_option_id: 'A', narrative_text: "You successfully reduced your workforce and COSTS...",
            effects: [
                { kpi: 'capacity', change_value: -1250, timing: 'immediate' }, { kpi: 'cost', change_value: -300000, timing: 'immediate' },
                { kpi: 'capacity', change_value: -1250, timing: 'permanent_next_round_start', applies_to_rounds: [2,3], description: 'Layoffs Impact' },
                { kpi: 'cost', change_value: -300000, timing: 'permanent_next_round_start', applies_to_rounds: [2,3], description: 'Layoffs Impact (Savings)' }
            ],
            impact_card_image_url: 'url_to_permanent_kpi_impact_layoffs_card.jpg'
        },
        { id: 'ch3_conseq_b', challenge_option_id: 'B', narrative_text: "You successfully furloughed workers...", effects: [{ kpi: 'capacity', change_value: -1000, timing: 'immediate' }, { kpi: 'cost', change_value: -200000, timing: 'immediate' } /* Add logic for workers returning in RD2 */] },
        { id: 'ch3_conseq_c', challenge_option_id: 'C', narrative_text: "You maintained your current headcount...", effects: [{ kpi: 'capacity', change_value: -500, timing: 'immediate' }, { kpi: 'cost', change_value: -100000, timing: 'immediate' }] },
        { id: 'ch3_conseq_d', challenge_option_id: 'D', narrative_text: "By not addressing the cashflow crisis...", effects: [{ kpi: 'capacity', change_value: -1000, timing: 'immediate' } /* Costs erased, so maybe no net cost change or slight increase */] },
    ],
    // ... Placeholders for CH4-CH9 consequences
};

export const masterInvestmentPayoffs: Record<string, InvestmentPayoff[]> = {
    'rd1-payoff': [
        { id: 'rd1_payoff_biz_growth', investment_option_id: 'rd1_biz_growth', name: "#1 Business Growth Strategy", effects: [{ kpi: 'capacity', change_value: 250, timing: 'immediate' }, { kpi: 'orders', change_value: 250, timing: 'immediate' }, { kpi: 'asp', change_value: 20, timing: 'immediate' }] },
        { id: 'rd1_payoff_prod_effic', investment_option_id: 'rd1_prod_effic', name: "#2 Production Efficiency", effects: [{ kpi: 'capacity', change_value: 1500, timing: 'immediate' }] },
        { id: 'rd1_payoff_2nd_shift', investment_option_id: 'rd1_2nd_shift', name: "#3 Add 2nd Shift", effects: [{ kpi: 'capacity', change_value: 1500, timing: 'immediate' }, { kpi: 'cost', change_value: 300000, timing: 'immediate' }] },
        { id: 'rd1_payoff_sup_chain', investment_option_id: 'rd1_sup_chain', name: "#4 Supply Chain Optimization", effects: [{ kpi: 'capacity', change_value: 250, timing: 'immediate' }, { kpi: 'cost', change_value: -100000, timing: 'immediate' }] },
        { id: 'rd1_payoff_emp_dev', investment_option_id: 'rd1_emp_dev', name: "#5 Employee Development", effects: [{ kpi: 'capacity', change_value: 250, timing: 'immediate' }, { kpi: 'cost', change_value: -25000, timing: 'immediate' }] },
        { id: 'rd1_payoff_boutique', investment_option_id: 'rd1_boutique', name: "#6 Maximize Sales", effects: [{ kpi: 'orders', change_value: 500, timing: 'immediate' }, { kpi: 'asp', change_value: 20, timing: 'immediate' }] },
    ],
    // ... Placeholders for RD-2 and RD-3 payoffs
};


// --- MAIN GAME STRUCTURE OBJECT ---
export const readyOrNotGame_2_0_DD: GameStructure = {
    id: "ready_or_not_2.0_dd",
    name: "Ready Or Not 2.0 (with Double Down)",
    welcome_phases: gamePhases_Welcome,
    rounds: [
        { id: "round1", name: "Round 1: Years 1 & 2", year_label: "Years 1 & 2", phases: gamePhases_Round1 },
        { id: "round2", name: "Round 2: Years 3 & 4", year_label: "Years 3 & 4", phases: gamePhases_Round2 }, // Placeholder phases
        { id: "round3", name: "Round 3: Year 5", year_label: "Year 5", phases: gamePhases_Round3 },       // Placeholder phases
    ],
    game_end_phases: gamePhases_End,
    slides: masterSlides,
    all_investment_options: masterInvestmentOptions,
    all_challenge_options: masterChallengeOptions,
    investment_phase_budgets: {
        'rd1-invest': 250000,
        'rd2-invest': 500000,
        'rd3-invest': 600000,
    },
    all_consequences: masterConsequences,
    all_investment_payoffs: masterInvestmentPayoffs,
};

// You might have other game versions later
// export const readyOrNotGame_1_5_DD: GameStructure = { ... };