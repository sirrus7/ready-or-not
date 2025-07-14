-- payoff_applications.sql
-- Depends on: sessions, teams

CREATE TABLE public.payoff_applications
(
    id                  uuid    NOT NULL         DEFAULT gen_random_uuid(),
    session_id          uuid    NOT NULL,
    team_id             uuid    NOT NULL,
    slide_id            integer NOT NULL,
    applied_at          timestamp with time zone DEFAULT now(),
    created_at          timestamp with time zone DEFAULT now(),
    investment_phase_id text    NOT NULL         DEFAULT 'rd1-invest'::text,
    option_id           text    NOT NULL         DEFAULT 'A'::text,
    CONSTRAINT payoff_applications_pkey PRIMARY KEY (id),
    CONSTRAINT payoff_applications_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions (id) ON DELETE CASCADE,
    CONSTRAINT payoff_applications_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_payoff_applications_session_id ON public.payoff_applications (session_id);
CREATE INDEX idx_payoff_applications_team_id ON public.payoff_applications (team_id);
CREATE INDEX idx_payoff_applications_slide_id ON public.payoff_applications (slide_id);
CREATE INDEX idx_payoff_applications_applied_at ON public.payoff_applications (applied_at);

-- Enable RLS
ALTER TABLE public.payoff_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE
POLICY hosts_manage_payoffs ON public.payoff_applications FOR ALL TO PUBLIC AS PERMISSIVE USING (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM sessions
  WHERE ((sessions.id = payoff_applications.session_id) AND (sessions.host_id = auth.uid())))))) WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM sessions
  WHERE ((sessions.id = payoff_applications.session_id) AND (sessions.host_id = auth.uid()))))));

CREATE
POLICY teams_read_payoffs ON public.payoff_applications FOR
SELECT TO PUBLIC AS PERMISSIVE USING (true);
