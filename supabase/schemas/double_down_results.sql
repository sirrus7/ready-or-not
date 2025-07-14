-- double_down_results.sql
-- Depends on: sessions

CREATE TABLE public.double_down_results
(
    id               uuid    NOT NULL         DEFAULT gen_random_uuid(),
    session_id       uuid    NOT NULL,
    investment_id    text    NOT NULL,
    dice1_value      integer NOT NULL CHECK (dice1_value >= 1 AND dice1_value <= 6),
    dice2_value      integer NOT NULL CHECK (dice2_value >= 1 AND dice2_value <= 6),
    total_value      integer NOT NULL CHECK (total_value >= 2 AND total_value <= 12),
    boost_percentage integer NOT NULL CHECK (boost_percentage = ANY (ARRAY[0, 25, 75, 100])),
    affected_teams   text[] NOT NULL DEFAULT '{}'::text[],
    created_at       timestamp with time zone DEFAULT now(),
    CONSTRAINT double_down_results_pkey PRIMARY KEY (id),
    CONSTRAINT double_down_results_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_double_down_results_session_id ON public.double_down_results (session_id);
CREATE INDEX idx_double_down_results_investment_id ON public.double_down_results (investment_id);
CREATE INDEX idx_double_down_results_total_value ON public.double_down_results (total_value);
CREATE INDEX idx_double_down_results_created_at ON public.double_down_results (created_at);

-- Enable RLS
ALTER TABLE public.double_down_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE
POLICY authenticated_users_manage_doubledown ON public.double_down_results FOR ALL TO PUBLIC AS PERMISSIVE USING (true) WITH CHECK (true);

CREATE
POLICY hosts_manage_doubledown ON public.double_down_results FOR ALL TO PUBLIC AS PERMISSIVE USING (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM sessions
  WHERE ((sessions.id = double_down_results.session_id) AND (sessions.host_id = auth.uid())))))) WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM sessions
  WHERE ((sessions.id = double_down_results.session_id) AND (sessions.host_id = auth.uid()))))));

CREATE
POLICY teams_read_doubledown ON public.double_down_results FOR
SELECT TO PUBLIC AS PERMISSIVE USING (true);

CREATE
POLICY universal_insert_doubledown ON public.double_down_results FOR INSERT TO PUBLIC AS PERMISSIVE WITH CHECK (true);
