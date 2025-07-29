-- =====================================================
-- READY OR NOT - INITIAL DATABASE SETUP
-- =====================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- =====================================================
-- USERS TABLE (extends auth.users)
-- =====================================================

-- User profiles table to extend Supabase auth.users
create table if not exists public.profiles (
                                               id uuid references auth.users(id) on delete cascade primary key,
    email text unique not null,
    full_name text,
    first_name text,
    last_name text,
    avatar_url text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,

    -- Game-specific fields
    is_host boolean default false,
    host_organization text,

    -- Magic link tracking
    created_by_global_loader boolean default false,
    global_user_id uuid, -- Reference to Global Game Loader user

    constraint profiles_email_check check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
    );

-- =====================================================
-- GAME SESSIONS TABLE
-- =====================================================

create type game_status as enum ('draft', 'active', 'paused', 'completed', 'cancelled');

create table if not exists public.game_sessions (
                                                    id uuid default uuid_generate_v4() primary key,
    host_id uuid references public.profiles(id) on delete cascade not null,

    -- Session details
    title text not null,
    description text,
    status game_status default 'draft' not null,

    -- Game configuration
    max_participants integer default 30,
    duration_minutes integer default 45,

    -- Timestamps
    scheduled_start timestamptz,
    actual_start timestamptz,
    actual_end timestamptz,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,

    -- Metadata
    session_code text unique, -- For participants to join
    settings jsonb default '{}' not null
    );

-- =====================================================
-- PARTICIPANTS TABLE
-- =====================================================

create table if not exists public.participants (
                                                   id uuid default uuid_generate_v4() primary key,
    session_id uuid references public.game_sessions(id) on delete cascade not null,

    -- Participant info
    name text not null,
    email text,
    team_name text,

    -- Game state
    joined_at timestamptz default now() not null,
    last_active timestamptz default now() not null,
    score integer default 0,
    progress jsonb default '{}' not null,

    -- Constraints
    unique(session_id, email) -- Prevent duplicate participants
    );

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.game_sessions enable row level security;
alter table public.participants enable row level security;

-- Profiles policies
create policy "Users can view own profile" on public.profiles
    for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
    for update using (auth.uid() = id);

create policy "Enable insert for authenticated users" on public.profiles
    for insert with check (auth.uid() = id);

-- Game sessions policies
create policy "Hosts can manage own sessions" on public.game_sessions
    for all using (auth.uid() = host_id);

create policy "Anyone can view active sessions" on public.game_sessions
    for select using (status = 'active');

-- Participants policies
create policy "Participants can view session participants" on public.participants
    for select using (
                   exists (
                   select 1 from public.game_sessions gs
                   where gs.id = session_id
                   and (gs.host_id = auth.uid() or gs.status = 'active')
                   )
                   );

create policy "Anyone can join active sessions" on public.participants
    for insert with check (
        exists (
            select 1 from public.game_sessions gs
            where gs.id = session_id and gs.status = 'active'
        )
    );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger handle_profiles_updated_at
    before update on public.profiles
    for each row execute function public.handle_updated_at();

create trigger handle_game_sessions_updated_at
    before update on public.game_sessions
    for each row execute function public.handle_updated_at();

-- Function to create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
insert into public.profiles (id, email, full_name, first_name, last_name)
values (
           new.id,
           new.email,
           coalesce(new.raw_user_meta_data->>'full_name', new.email),
           new.raw_user_meta_data->>'first_name',
           new.raw_user_meta_data->>'last_name'
       );
return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on user creation
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to generate session codes
create or replace function public.generate_session_code()
returns text as $$
declare
code text;
exists boolean;
begin
    loop
        -- Generate 6-character code
code := upper(substring(encode(gen_random_bytes(4), 'base64') from 1 for 6));
        -- Remove confusing characters
        code := replace(replace(replace(replace(code, '0', 'A'), '1', 'B'), 'O', 'C'), 'I', 'D');

        -- Check if code already exists
select exists(select 1 from public.game_sessions where session_code = code) into exists;

if not exists then
            exit;
end if;
end loop;

return code;
end;
$$ language plpgsql;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

create index if not exists idx_game_sessions_host_id on public.game_sessions(host_id);
create index if not exists idx_game_sessions_status on public.game_sessions(status);
create index if not exists idx_game_sessions_session_code on public.game_sessions(session_code);
create index if not exists idx_participants_session_id on public.participants(session_id);
create index if not exists idx_participants_email on public.participants(email);

-- =====================================================
-- COMPLETION
-- =====================================================

-- Insert success message
do $$
begin
    raise notice 'Ready or Not database setup completed successfully!';
    raise notice 'Tables created: profiles, game_sessions, participants';
    raise notice 'RLS policies enabled for security';
    raise notice 'Triggers and functions configured';
end $$;