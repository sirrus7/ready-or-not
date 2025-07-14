-- team_round_data.sql
-- Depends on: sessions, teams

CREATE TABLE public.team_round_data
(
    id               uuid    NOT NULL         DEFAULT gen_random_uuid(),
    session_id       uuid    NOT NULL,
    team_id          uuid    NOT NULL,
    round_number     integer NOT NULL CHECK (round_number = ANY (ARRAY[1, 2, 3])),
    start_capacity   integer                  DEFAULT 0,
    start_orders     integer                  DEFAULT 0,
    start_cost       integer                  DEFAULT 0,
    start_asp        integer                  DEFAULT 0,
    current_capacity integer                  DEFAULT 0,
    current_orders   integer                  DEFAULT 0,
    current_cost     integer                  DEFAULT 0,
    current_asp      integer                  DEFAULT 0,
    revenue          integer,
    net_margin       real,
    net_income       integer,
    created_at       timestamp with time zone DEFAULT now(),
    updated_at       timestamp with time zone DEFAULT now(),
    CONSTRAINT team_round_data_pkey PRIMARY KEY (id),
    CONSTRAINT team_round_data_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions (id) ON DELETE CASCADE,
    CONSTRAINT team_round_data_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_team_round_data_session_id ON public.team_round_data (session_id);
CREATE INDEX idx_team_round_data_team_id ON public.team_round_data (team_id);
CREATE INDEX idx_team_round_data_team_round ON public.team_round_data (team_id, round_number);
CREATE INDEX idx_team_round_data_updated_at ON public.team_round_data (updated_at);
