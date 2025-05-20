// src/types/index.ts

import { User as SupabaseUser } from '@supabase/supabase-js';

// --- User & Authentication ---
export type User = SupabaseUser;

// --- Core Game Entities ---
export interface GameSession {
  id: string; // Unique UUID from Supabase
  teacher_id: string; // FK to Supabase auth.users
  name: string; // e.g., "Justin's Test"
  game_version: '2.0_dd' | '1.5_dd'; // Version of the game being played
  class_name?: string | null; // e.g., "Math" - Make nullable if DB column allows NULL
  grade_level?: string | null; // e.g., "Freshman" - Make nullable if DB column allows NULL
  current_phase_id: string | null; // ID of the current GamePhaseNode
  current_slide_id_in_phase: number | null; // Index within the phase's slide_ids array
  is_playing: boolean; // Is the game actively being presented (vs. paused)
  is_complete: boolean;
  teacher_notes: Record<number, string> | null; // Store notes as { slideId: "note text" }, or null from DB
  created_at: string;
  updated_at: string;
  // Add any other columns from your 'sessions' table you might use, like num_players, num_teams if you added them
  // num_players?: number | null;
  // num_teams_configured?: number | null;
}

export interface Team {
  id: string; // Unique UUID from Supabase
  session_id: string; // FK to GameSession
  name: string; // e.g., "Crane", "Willow"
  passcode: string; // Simple numeric code for team login
  // Add other team-specific persistent data if needed
}

// --- Key Performance Indicators (KPIs) ---
export interface KPIs {
  capacity: number;
  orders: number;
  cost: number; // Store as a whole number, e.g., 1200000 for $1.2M
  asp: number; // Average Selling Price, store as whole number, e.g., 1000 for $1,000
}

export interface TeamRoundData {
  id: string; // Unique UUID
  session_id: string;
  team_id: string;
  round_number: 1 | 2 | 3;
  // Starting KPIs for this round (after permanent adjustments)
  start_capacity: number;
  start_orders: number;
  start_cost: number;
  start_asp: number;
  // Current KPIs for this round (updated by decisions within the round)
  current_capacity: number;
  current_orders: number;
  current_cost: number;
  current_asp: number;
  // Calculated at end of round
  revenue?: number;
  net_margin?: number; // Store as percentage, e.g., 0.04 for 4%
  net_income?: number;
}

// --- Decisions & Options ---
export interface InvestmentOption {
  id: string; // e.g., "biz_growth_rd1"
  name: string; // e.g., "1. Biz Growth"
  cost: number;
  description?: string;
}

export interface ChallengeOption {
  id: string; // e.g., "A", "B", "C", "D"
  text: string;
  estimated_cost?: number; // Can be positive or negative (savings)
  immediate_kpi_impact_preview?: string; // e.g., "-250 CAP, +$50K COSTS"
  is_default_choice?: boolean; // For auto-submission on timeout
}

export interface DoubleDownChoice {
  investmentToSacrificeId: string | null; // ID of RD-3 investment chosen to remove
  investmentToDoubleDownId: string | null; // ID of RD-3 investment chosen to double
}

export interface TeamDecision {
  id: string; // Unique UUID
  session_id: string;
  team_id: string;
  phase_id: string; // e.g., "rd1-invest", "ch1", "double-down"
  round_number: 1 | 2 | 3;
  selected_investment_ids?: string[]; // For investment phases
  selected_challenge_option_id?: string; // For choice phases
  double_down_decision?: DoubleDownChoice; // For double down phase
  total_spent_budget?: number; // For investment phases
  submitted_at: string;
}

// --- Game Creation Wizard Specific Types ---
export interface TeamConfig {
  name: string;
  passcode: string;
}

export interface NewGameData {
  game_version: '2.0_dd' | '1.5_dd';
  name: string;
  class_name: string;
  grade_level: string;
  num_players: number;
  num_teams: number;
  teams_config?: TeamConfig[]; // Array of team configurations
}

// --- Consequences & Payoffs ---
export type KpiKey = 'capacity' | 'orders' | 'cost' | 'asp' | 'revenue' | 'net_margin' | 'net_income';

export interface KpiEffect {
  kpi: KpiKey;
  change_value: number; // Amount to change by (can be negative)
  is_percentage_change?: boolean; // If true, change_value is a percentage (e.g., 0.05 for +5%)
  timing: 'immediate' | 'permanent_next_round_start' | 'end_of_round_adjustment';
  description?: string; // For tracking permanent effects e.g., "CNC Machine Bonus"
  applies_to_rounds?: (1 | 2 | 3)[]; // For permanent effects that apply to specific future rounds
}

export interface Consequence {
  id: string; // e.g., "ch1_consequence_a"
  challenge_option_id: string; // Links to the specific option chosen
  narrative_text: string;
  effects: KpiEffect[];
  teacher_alert?: string; // For facilitator desk interactions
  student_notification?: string; // Message for the student app
  impact_card_image_url?: string; // If there's a visual "card"
}

export interface InvestmentPayoff {
  id: string; // e.g., "rd1_payoff_biz_growth"
  investment_option_id: string; // Links to the investment option
  name: string; // e.g., "#1 Business Growth Strategy"
  effects: KpiEffect[];
}

export interface DoubleDownPayoffRollResult {
  dice_roll: number; // 2-12
  percentage_boost: number; // e.g., 0, 25, 75, 100, 125
  description: string; // e.g., "2-0% Boost", "9-12=100% Increase"
}

// --- Slide & Game Flow Structure ---
export type SlideType =
    | 'image' // Simple image display
    | 'video' // Plays a video
    | 'content_page' // Static text, lists, titles
    | 'interactive_invest' // Prompts student app for investment decisions
    | 'interactive_choice' // Prompts student app for A/B/C/D choice
    | 'interactive_double_down_prompt' // Prompts student: "Do you want to double down?"
    | 'interactive_double_down_select' // Student selects which investments to double down/sacrifice
    | 'consequence_reveal' // Shows consequence for a specific team choice (teacher navigates to the right one)
    | 'payoff_reveal' // Shows payoff for a specific investment (teacher navigates)
    | 'double_down_dice_roll' // Animation/display of dice roll
    | 'kpi_summary_instructional' // E.g., "CFO record your KPIs"
    | 'leaderboard_chart' // Displays a specific leaderboard chart
    | 'game_end_summary';

export interface Slide {
  id: number; // Unique within the entire game's slide deck
  title?: string; // Optional title displayed on the slide itself or for teacher reference
  phase_id?: string; // Which GamePhaseNode this slide belongs to
  type: SlideType;
  source_url?: string; // URL for image or video
  main_text?: string; // Primary text content for content_page or titles
  sub_text?: string; // Secondary text
  bullet_points?: string[];
  background_css?: string;
  // For interactive slides, this signals the student app what to display/do
  interactive_data_key?: string; // e.g., "rd1_invest_options", "ch1_options" to fetch decision options
  timer_duration_seconds?: number; // For timed student interactions shown ON THIS SLIDE.
                                   // If video has timer, this might not be needed for that slide.
  auto_advance_after_video?: boolean; // If true, move to next slide after video ends
  teacher_alert?: {
    title: string;
    message: string;
  };
}

export interface GamePhaseNode {
  id: string; // e.g., "welcome", "rd1-invest", "ch1", "ch1-consequences", "rd1-payoffs"
  label: string; // Text on the Journey Map button (e.g., "RD-1 INVEST")
  sub_label?: string; // e.g., "15M" or "Years 1 & 2"
  icon_name: string; // Lucide icon name (as string)
  phase_type: 'welcome' | 'setup' | 'narration' | 'invest' | 'choice' | 'consequence' | 'payoff' | 'double-down-prompt' | 'double-down-select' | 'double-down-payoff' | 'kpi' | 'leaderboard' | 'game-end';
  round_number: 0 | 1 | 2 | 3; // 0 for pre-game/welcome
  slide_ids: number[]; // Sequence of slide IDs that make up this phase
  is_interactive_student_phase: boolean; // True if students make decisions on their app during this phase
  // Expected duration from video or for teacher pacing, in minutes
  expected_duration_minutes?: number;
}

export interface GameRound {
  id: string; // e.g., "round1"
  name: string; // e.g., "Round 1: Years 1 & 2"
  year_label: string; // e.g., "Years 1 & 2"
  phases: GamePhaseNode[];
}

export interface GameStructure {
  id: string; // e.g., "ready_or_not_2.0_dd"
  name: string;
  welcome_phases: GamePhaseNode[];
  rounds: GameRound[];
  game_end_phases: GamePhaseNode[];
  slides: Slide[]; // Master list of all slides
  // Master lists of all options for quicker lookup by student app
  all_investment_options: Record<string, InvestmentOption[]>; // Keyed by phase_id like "rd1-invest"
  all_challenge_options: Record<string, ChallengeOption[]>; // Keyed by phase_id like "ch1"
  all_consequences: Record<string, Consequence[]>; // Keyed by phase_id like "ch1-consequences"
  all_investment_payoffs: Record<string, InvestmentPayoff[]>; // Keyed by phase_id like "rd1-payoffs"
  // ... potentially more master data lists
}


// --- Application State (Teacher's AppContext) ---
export interface AppState {
  currentSessionId: string | null;
  gameStructure: GameStructure | null; // Loaded game definition
  currentPhaseId: string | null;
  currentSlideIdInPhase: number | null; // Index of current slide within currentPhase.slide_ids
  teacherNotes: Record<number, string>; // Keyed by slide ID
  isPlaying: boolean; // For videos or auto-advancing slides
  teams: Team[]; // Teams in the current session
  teamDecisions: Record<string, TeamDecision[]>; // Key: teamId, Value: array of their decisions
  teamRoundData: Record<string, TeamRoundData[]>; // Key: teamId, Value: array of their round data
  // For student display window management
  isStudentWindowOpen: boolean;
  // UI state
  isLoading: boolean;
  error: string | null;
  currentTeacherAlert: { title: string, message: string } | null;
}

// --- Student App State (Simplified, managed locally or via props in StudentGamePage) ---
export interface StudentPageState {
  teamId: string | null;
  teamName: string | null;
  currentSessionId: string | null;
  // Data broadcasted from teacher or fetched based on teacher signals
  activePhaseId: string | null; // What phase the teacher has initiated
  activeSlideData: Slide | null; // What content the teacher is currently showing (if not interactive)
  currentKpis: TeamRoundData | null; // Current team's live KPIs for the round
  availableChoices?: ChallengeOption[] | InvestmentOption[]; // Options for current decision
  decisionBudget?: { investUpTo: number, remaining: number, spent: number };
  timeRemainingSeconds?: number;
  isDecisionTime: boolean; // Is it currently time for this student's team to make a decision?
  lastSubmissionStatus?: 'success' | 'error' | null;
  // ... more as needed
}

// --- Broadcast Payloads ---
export interface TeacherBroadcastPayload {
  currentSlideId: number | null;       // ID of the slide teacher is currently on
  currentPhaseId: string | null;       // ID of the current GamePhaseNode
  currentPhaseType: GamePhaseNode['phase_type'] | null; // Type of the current phase
  currentRoundNumber: 0 | 1 | 2 | 3 | null; // Current round number

  isPlayingVideo: boolean;             // Is the teacher currently "playing" a video slide on the main display

  isStudentDecisionPhaseActive: boolean; // TRUE if students should be making a decision NOW
  decisionOptionsKey?: string;         // Key to lookup options in gameStructure (e.g., "rd1-invest", "ch1")
  decisionPhaseTimerEndTime?: number;  // Epoch ms when the current decision timer ends
}

// Interface for messages from Student Display to Teacher AppContext (optional, but good for structure)
export interface StudentDisplayMessage {
  type: 'STUDENT_DISPLAY_READY' | 'STUDENT_DISPLAY_CLOSING';
  payload: {
    sessionId: string | null;
  };
}
