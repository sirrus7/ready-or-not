-- team_decisions.sql
-- Depends on: sessions, teams

CREATE TABLE public.team_decisions
(
    id                           uuid    NOT NULL         DEFAULT gen_random_uuid(),
    session_id                   uuid    NOT NULL,
    team_id                      uuid    NOT NULL,
    phase_id                     text    NOT NULL,
    round_number                 integer NOT NULL CHECK (round_number = ANY (ARRAY[1, 2, 3])),
    selected_challenge_option_id text,
    double_down_sacrifice_id     text,
    double_down_on_id            text,
    total_spent_budget           integer,
    submitted_at                 timestamp with time zone DEFAULT now(),
    is_immediate_purchase        boolean                  DEFAULT false,
    immediate_purchase_type      text,
    immediate_purchase_data      jsonb,
    report_given                 boolean                  DEFAULT false,
    report_given_at              timestamp with time zone,
    selected_investment_options  text[],
    CONSTRAINT team_decisions_pkey PRIMARY KEY (id),
    CONSTRAINT team_decisions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions (id) ON DELETE CASCADE,
    CONSTRAINT team_decisions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_team_decisions_session_id ON public.team_decisions (session_id);
CREATE INDEX idx_team_decisions_team_id ON public.team_decisions (team_id);
CREATE INDEX idx_team_decisions_phase_round ON public.team_decisions (phase_id, round_number);
CREATE INDEX idx_team_decisions_submitted_at ON public.team_decisions (submitted_at);

-- Enable RLS
ALTER TABLE public.team_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE
POLICY hosts_manage_decisions ON public.team_decisions FOR ALL TO PUBLIC AS PERMISSIVE USING (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM sessions
  WHERE ((sessions.id = team_decisions.session_id) AND (sessions.host_id = auth.uid())))))) WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM sessions
  WHERE ((sessions.id = team_decisions.session_id) AND (sessions.host_id = auth.uid()))))));

CREATE
POLICY teams_insert_decisions ON public.team_decisions FOR INSERT TO PUBLIC AS PERMISSIVE WITH CHECK (true);

CREATE
POLICY teams_read_decisions ON public.team_decisions FOR
SELECT TO PUBLIC AS PERMISSIVE USING (true);

CREATE
POLICY universal_team_decisions ON public.team_decisions FOR ALL TO PUBLIC AS PERMISSIVE USING (true) WITH CHECK (true);
