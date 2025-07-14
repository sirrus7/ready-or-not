-- sessions.sql
-- Depends on: auth.users (provided by Supabase)

CREATE TABLE public.sessions
(
    id                  uuid NOT NULL            DEFAULT gen_random_uuid(),
    host_id             uuid NOT NULL,
    name                text NOT NULL,
    game_version        text NOT NULL,
    class_name          text,
    grade_level         text,
    is_playing          boolean                  DEFAULT false,
    is_complete         boolean                  DEFAULT false,
    host_notes          jsonb                    DEFAULT '{}'::jsonb,
    created_at          timestamp with time zone DEFAULT now(),
    updated_at          timestamp with time zone DEFAULT now(),
    status              text                     DEFAULT 'active'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'completed'::text])),
    wizard_state        jsonb                    DEFAULT '{}'::jsonb,
    current_slide_index integer                  DEFAULT 0,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_host_id_fkey FOREIGN KEY (host_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_sessions_host_id ON public.sessions (host_id);
CREATE INDEX idx_sessions_status ON public.sessions (status);
CREATE INDEX idx_sessions_created_at ON public.sessions (created_at);
