-- teams.sql
-- Depends on: sessions

CREATE TABLE public.teams
(
    id         uuid NOT NULL            DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    name       text NOT NULL,
    passcode   text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT teams_pkey PRIMARY KEY (id),
    CONSTRAINT teams_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_teams_session_id ON public.teams (session_id);
CREATE INDEX idx_teams_passcode ON public.teams (passcode);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE
POLICY hosts_manage_teams ON public.teams FOR ALL TO PUBLIC AS PERMISSIVE USING (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM sessions
  WHERE ((sessions.id = teams.session_id) AND (sessions.host_id = auth.uid())))))) WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM sessions
  WHERE ((sessions.id = teams.session_id) AND (sessions.host_id = auth.uid()))))));

CREATE
POLICY teams_read_all ON public.teams FOR
SELECT TO PUBLIC AS PERMISSIVE USING (true);
