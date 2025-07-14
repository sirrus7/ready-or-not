-- permanent_kpi_adjustments.sql
-- Depends on: sessions, teams

CREATE TABLE public.permanent_kpi_adjustments
(
    id                     uuid    NOT NULL         DEFAULT gen_random_uuid(),
    session_id             uuid    NOT NULL,
    team_id                uuid    NOT NULL,
    applies_to_round_start integer NOT NULL CHECK (applies_to_round_start = ANY (ARRAY[1, 2, 3])),
    kpi_key                text    NOT NULL CHECK (kpi_key = ANY (ARRAY['capacity'::text, 'orders'::text, 'cost'::text, 'asp'::text])),
    change_value           integer NOT NULL,
    description            text,
    challenge_id           text    NOT NULL,
    option_id              text    NOT NULL,
    created_at             timestamp with time zone DEFAULT now(),
    CONSTRAINT permanent_kpi_adjustments_pkey PRIMARY KEY (id),
    CONSTRAINT permanent_kpi_adjustments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams (id) ON DELETE CASCADE,
    CONSTRAINT permanent_kpi_adjustments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_permanent_kpi_adjustments_session_id ON public.permanent_kpi_adjustments (session_id);
CREATE INDEX idx_permanent_kpi_adjustments_team_id ON public.permanent_kpi_adjustments (team_id);
CREATE INDEX idx_permanent_kpi_adjustments_round_start ON public.permanent_kpi_adjustments (applies_to_round_start);
CREATE INDEX idx_permanent_kpi_adjustments_kpi_key ON public.permanent_kpi_adjustments (kpi_key);
