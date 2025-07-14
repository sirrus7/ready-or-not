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
