-- Database Creation Script for Dev Environment
-- This script creates all necessary tables in the correct order to avoid foreign key constraint issues

-- Create public schema (usually exists by default)
CREATE SCHEMA IF NOT EXISTS public;

-- Sessions table (depends on auth.users)
CREATE TABLE public.sessions (
                                 id uuid NOT NULL DEFAULT gen_random_uuid(),
                                 host_id uuid NOT NULL,
                                 name text NOT NULL,
                                 game_version text NOT NULL,
                                 class_name text,
                                 grade_level text,
                                 is_playing boolean DEFAULT false,
                                 is_complete boolean DEFAULT false,
                                 host_notes jsonb DEFAULT '{}'::jsonb,
                                 created_at timestamp with time zone DEFAULT now(),
                                 updated_at timestamp with time zone DEFAULT now(),
                                 status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'completed'::text])),
                                 wizard_state jsonb DEFAULT '{}'::jsonb,
                                 current_slide_index integer DEFAULT 0,
                                 CONSTRAINT sessions_pkey PRIMARY KEY (id),
                                 CONSTRAINT sessions_host_id_fkey FOREIGN KEY (host_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Teams table (depends on sessions)
CREATE TABLE public.teams (
                              id uuid NOT NULL DEFAULT gen_random_uuid(),
                              session_id uuid NOT NULL,
                              name text NOT NULL,
                              passcode text NOT NULL,
                              created_at timestamp with time zone DEFAULT now(),
                              CONSTRAINT teams_pkey PRIMARY KEY (id),
                              CONSTRAINT teams_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

-- Team decisions table (depends on sessions and teams)
CREATE TABLE public.team_decisions (
                                       id uuid NOT NULL DEFAULT gen_random_uuid(),
                                       session_id uuid NOT NULL,
                                       team_id uuid NOT NULL,
                                       phase_id text NOT NULL,
                                       round_number integer NOT NULL CHECK (round_number = ANY (ARRAY[1, 2, 3])),
                                       selected_challenge_option_id text,
                                       double_down_sacrifice_id text,
                                       double_down_on_id text,
                                       total_spent_budget integer,
                                       submitted_at timestamp with time zone DEFAULT now(),
                                       is_immediate_purchase boolean DEFAULT false,
                                       immediate_purchase_type text,
                                       immediate_purchase_data jsonb,
                                       report_given boolean DEFAULT false,
                                       report_given_at timestamp with time zone,
                                       selected_investment_options text[], -- Changed from ARRAY to text[] for clarity
                                       CONSTRAINT team_decisions_pkey PRIMARY KEY (id),
                                       CONSTRAINT team_decisions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
                                       CONSTRAINT team_decisions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- Team round data table (depends on sessions and teams)
CREATE TABLE public.team_round_data (
                                        id uuid NOT NULL DEFAULT gen_random_uuid(),
                                        session_id uuid NOT NULL,
                                        team_id uuid NOT NULL,
                                        round_number integer NOT NULL CHECK (round_number = ANY (ARRAY[1, 2, 3])),
                                        start_capacity integer DEFAULT 0,
                                        start_orders integer DEFAULT 0,
                                        start_cost integer DEFAULT 0,
                                        start_asp integer DEFAULT 0,
                                        current_capacity integer DEFAULT 0,
                                        current_orders integer DEFAULT 0,
                                        current_cost integer DEFAULT 0,
                                        current_asp integer DEFAULT 0,
                                        revenue integer,
                                        net_margin real,
                                        net_income integer,
                                        created_at timestamp with time zone DEFAULT now(),
                                        updated_at timestamp with time zone DEFAULT now(),
                                        CONSTRAINT team_round_data_pkey PRIMARY KEY (id),
                                        CONSTRAINT team_round_data_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
                                        CONSTRAINT team_round_data_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- Payoff applications table (depends on sessions and teams)
CREATE TABLE public.payoff_applications (
                                            id uuid NOT NULL DEFAULT gen_random_uuid(),
                                            session_id uuid NOT NULL,
                                            team_id uuid NOT NULL,
                                            slide_id integer NOT NULL,
                                            applied_at timestamp with time zone DEFAULT now(),
                                            created_at timestamp with time zone DEFAULT now(),
                                            investment_phase_id text NOT NULL DEFAULT 'rd1-invest'::text,
                                            option_id text NOT NULL DEFAULT 'A'::text,
                                            CONSTRAINT payoff_applications_pkey PRIMARY KEY (id),
                                            CONSTRAINT payoff_applications_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
                                            CONSTRAINT payoff_applications_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- Permanent KPI adjustments table (depends on sessions and teams)
CREATE TABLE public.permanent_kpi_adjustments (
                                                  id uuid NOT NULL DEFAULT gen_random_uuid(),
                                                  session_id uuid NOT NULL,
                                                  team_id uuid NOT NULL,
                                                  applies_to_round_start integer NOT NULL CHECK (applies_to_round_start = ANY (ARRAY[1, 2, 3])),
                                                  kpi_key text NOT NULL CHECK (kpi_key = ANY (ARRAY['capacity'::text, 'orders'::text, 'cost'::text, 'asp'::text])),
                                                  change_value integer NOT NULL,
                                                  description text,
                                                  challenge_id text NOT NULL,
                                                  option_id text NOT NULL,
                                                  created_at timestamp with time zone DEFAULT now(),
                                                  CONSTRAINT permanent_kpi_adjustments_pkey PRIMARY KEY (id),
                                                  CONSTRAINT permanent_kpi_adjustments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
                                                  CONSTRAINT permanent_kpi_adjustments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

-- Double down results table (depends on sessions)
CREATE TABLE public.double_down_results (
                                            id uuid NOT NULL DEFAULT gen_random_uuid(),
                                            session_id uuid NOT NULL,
                                            investment_id text NOT NULL,
                                            dice1_value integer NOT NULL CHECK (dice1_value >= 1 AND dice1_value <= 6),
                                            dice2_value integer NOT NULL CHECK (dice2_value >= 1 AND dice2_value <= 6),
                                            total_value integer NOT NULL CHECK (total_value >= 2 AND total_value <= 12),
                                            boost_percentage integer NOT NULL CHECK (boost_percentage = ANY (ARRAY[0, 25, 75, 100])),
                                            affected_teams text[] NOT NULL DEFAULT '{}'::text[], -- Changed from ARRAY to text[] for clarity
                                            created_at timestamp with time zone DEFAULT now(),
                                            CONSTRAINT double_down_results_pkey PRIMARY KEY (id),
                                            CONSTRAINT double_down_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_host_id ON public.sessions(host_id);
CREATE INDEX idx_teams_session_id ON public.teams(session_id);
CREATE INDEX idx_team_decisions_session_id ON public.team_decisions(session_id);
CREATE INDEX idx_team_decisions_team_id ON public.team_decisions(team_id);
CREATE INDEX idx_team_round_data_session_id ON public.team_round_data(session_id);
CREATE INDEX idx_team_round_data_team_id ON public.team_round_data(team_id);
CREATE INDEX idx_payoff_applications_session_id ON public.payoff_applications(session_id);
CREATE INDEX idx_payoff_applications_team_id ON public.payoff_applications(team_id);
CREATE INDEX idx_permanent_kpi_adjustments_session_id ON public.permanent_kpi_adjustments(session_id);
CREATE INDEX idx_permanent_kpi_adjustments_team_id ON public.permanent_kpi_adjustments(team_id);
CREATE INDEX idx_double_down_results_session_id ON public.double_down_results(session_id);

-- Comments for reference
-- This script creates all tables in the correct dependency order
-- Added ON DELETE CASCADE for cleaner dev experience
-- Added indexes for commonly queried foreign keys
-- Changed generic ARRAY types to specific text[] for clarity
-- Included basic auth.users table for development (replace with your auth provider in production)