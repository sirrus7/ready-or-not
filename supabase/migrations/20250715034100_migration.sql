-- Migration: 20250715034100_migration.sql
-- Created: 2025-07-15 03:41:00 UTC
-- Description: Phase 1 - SSO Database Foundation for Ready-or-Not
-- This migration creates the core SSO infrastructure including sessions table,
-- helper functions, RLS policies, and session management capabilities.

-- =====================================================
-- ENABLE REQUIRED EXTENSIONS
-- =====================================================

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for secure random generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CREATE SSO SESSIONS TABLE
-- =====================================================

-- Create the main SSO sessions table
CREATE TABLE IF NOT EXISTS sso_sessions (
    -- Primary identification
                                            session_id VARCHAR(255) PRIMARY KEY,
                                            user_id UUID NOT NULL,

    -- User information
                                            email VARCHAR(255) NOT NULL,
                                            permission_level VARCHAR(50) NOT NULL DEFAULT 'host',

    -- Session metadata
                                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                            expires_at TIMESTAMPTZ NOT NULL,
                                            last_activity TIMESTAMPTZ DEFAULT NOW(),

    -- Security tracking
                                            ip_address INET,
                                            user_agent TEXT,

    -- Session state
                                            is_active BOOLEAN NOT NULL DEFAULT true,
                                            revoked_at TIMESTAMPTZ,
                                            revoked_by UUID,
                                            revoked_reason TEXT,

    -- Game-specific data
                                            game_context JSONB DEFAULT '{}',

    -- Timestamps
                                            updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_email ON sso_sessions(email);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires_at ON sso_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_active ON sso_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sso_sessions_permission_level ON sso_sessions(permission_level);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_last_activity ON sso_sessions(last_activity);

-- =====================================================
-- ADD TABLE CONSTRAINTS
-- =====================================================

-- Add constraint for valid permission levels
DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'valid_permission_level'
              AND table_name = 'sso_sessions'
        ) THEN
            ALTER TABLE sso_sessions ADD CONSTRAINT valid_permission_level
                CHECK (permission_level IN ('super_admin', 'admin', 'host', 'viewer'));
        END IF;
    END $$;

-- Add constraint for valid expiry dates
DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'valid_expires_at'
              AND table_name = 'sso_sessions'
        ) THEN
            ALTER TABLE sso_sessions ADD CONSTRAINT valid_expires_at
                CHECK (expires_at > created_at);
        END IF;
    END $$;

-- =====================================================
-- CREATE TRIGGER FUNCTIONS
-- =====================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_sso_sessions_updated_at ON sso_sessions;
CREATE TRIGGER update_sso_sessions_updated_at
    BEFORE UPDATE ON sso_sessions
    FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SESSION CONTEXT CONFIGURATION FUNCTIONS
-- =====================================================

-- Function to set session context for RLS policies
CREATE OR REPLACE FUNCTION set_session_context(session_id_value TEXT)
    RETURNS VOID AS $$
BEGIN
    -- Set the current session ID in the session context
    PERFORM set_config('app.current_session_id', session_id_value, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current session ID from context
CREATE OR REPLACE FUNCTION get_current_session_id()
    RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_session_id', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- BASIC HELPER FUNCTIONS
-- =====================================================

-- Function to get current SSO user ID
CREATE OR REPLACE FUNCTION get_current_sso_user_id()
    RETURNS UUID AS $$
DECLARE
    session_id_value TEXT;
    user_id_result UUID;
BEGIN
    -- Get the current session ID from context
    session_id_value := get_current_session_id();

    -- If no session ID, return NULL
    IF session_id_value IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get user ID from active session
    SELECT user_id INTO user_id_result
    FROM sso_sessions
    WHERE session_id = session_id_value
      AND is_active = true
      AND expires_at > NOW()
      AND revoked_at IS NULL;

    RETURN user_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current game host ID (if user is a host)
CREATE OR REPLACE FUNCTION get_current_game_host_id()
    RETURNS UUID AS $$
DECLARE
    session_id_value TEXT;
    user_id_result UUID;
BEGIN
    -- Get the current session ID from context
    session_id_value := get_current_session_id();

    -- If no session ID, return NULL
    IF session_id_value IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get user ID from active session where user is a host
    SELECT user_id INTO user_id_result
    FROM sso_sessions
    WHERE session_id = session_id_value
      AND is_active = true
      AND expires_at > NOW()
      AND revoked_at IS NULL
      AND permission_level IN ('host', 'admin', 'super_admin');

    RETURN user_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current session is admin
CREATE OR REPLACE FUNCTION is_session_admin()
    RETURNS BOOLEAN AS $$
DECLARE
    session_id_value TEXT;
    is_admin_result BOOLEAN := false;
BEGIN
    -- Get the current session ID from context
    session_id_value := get_current_session_id();

    -- If no session ID, return false
    IF session_id_value IS NULL THEN
        RETURN false;
    END IF;

    -- Check if session has admin privileges
    SELECT EXISTS(
        SELECT 1 FROM sso_sessions
        WHERE session_id = session_id_value
          AND is_active = true
          AND expires_at > NOW()
          AND revoked_at IS NULL
          AND permission_level IN ('admin', 'super_admin')
    ) INTO is_admin_result;

    RETURN is_admin_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SESSION MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to cleanup expired SSO sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sso_sessions()
    RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Update expired sessions to inactive
    UPDATE sso_sessions
    SET is_active = false,
        updated_at = NOW()
    WHERE expires_at <= NOW()
      AND is_active = true;

    GET DIAGNOSTICS cleanup_count = ROW_COUNT;

    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend SSO session
CREATE OR REPLACE FUNCTION extend_sso_session(
    p_session_id VARCHAR(255),
    p_extension_hours INTEGER DEFAULT 8
)
    RETURNS BOOLEAN AS $$
DECLARE
    session_exists BOOLEAN := false;
BEGIN
    -- Check if session exists and is active
    SELECT EXISTS(
        SELECT 1 FROM sso_sessions
        WHERE session_id = p_session_id
          AND is_active = true
          AND revoked_at IS NULL
    ) INTO session_exists;

    -- If session doesn't exist or is inactive, return false
    IF NOT session_exists THEN
        RETURN false;
    END IF;

    -- Extend the session
    UPDATE sso_sessions
    SET expires_at = NOW() + (p_extension_hours || ' hours')::INTERVAL,
        last_activity = NOW(),
        updated_at = NOW()
    WHERE session_id = p_session_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke SSO session
CREATE OR REPLACE FUNCTION revoke_sso_session(
    p_session_id VARCHAR(255),
    p_revoked_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT 'Manual revocation'
)
    RETURNS BOOLEAN AS $$
DECLARE
    session_exists BOOLEAN := false;
BEGIN
    -- Check if session exists and is active
    SELECT EXISTS(
        SELECT 1 FROM sso_sessions
        WHERE session_id = p_session_id
          AND is_active = true
          AND revoked_at IS NULL
    ) INTO session_exists;

    -- If session doesn't exist or is already revoked, return false
    IF NOT session_exists THEN
        RETURN false;
    END IF;

    -- Revoke the session
    UPDATE sso_sessions
    SET is_active = false,
        revoked_at = NOW(),
        revoked_by = p_revoked_by,
        revoked_reason = p_reason,
        updated_at = NOW()
    WHERE session_id = p_session_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new SSO session
CREATE OR REPLACE FUNCTION create_sso_session(
    p_user_id UUID,
    p_email VARCHAR(255),
    p_permission_level VARCHAR(50) DEFAULT 'host',
    p_duration_hours INTEGER DEFAULT 8,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_game_context JSONB DEFAULT '{}'
)
    RETURNS VARCHAR(255) AS $$
DECLARE
    new_session_id VARCHAR(255);
    max_attempts INTEGER := 5;
    attempt_count INTEGER := 0;
BEGIN
    -- Generate unique session ID with retry logic
    LOOP
        new_session_id := encode(gen_random_bytes(32), 'base64');

        -- Check if session ID is unique
        IF NOT EXISTS(SELECT 1 FROM sso_sessions WHERE session_id = new_session_id) THEN
            EXIT;
        END IF;

        attempt_count := attempt_count + 1;
        IF attempt_count >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique session ID after % attempts', max_attempts;
        END IF;
    END LOOP;

    -- Insert new session
    INSERT INTO sso_sessions (
        session_id,
        user_id,
        email,
        permission_level,
        expires_at,
        ip_address,
        user_agent,
        game_context
    ) VALUES (
                 new_session_id,
                 p_user_id,
                 p_email,
                 p_permission_level,
                 NOW() + (p_duration_hours || ' hours')::INTERVAL,
                 p_ip_address,
                 p_user_agent,
                 p_game_context
             );

    RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SCHEDULED CLEANUP FUNCTION
-- =====================================================

-- Function to be called by a scheduled job to cleanup old sessions
CREATE OR REPLACE FUNCTION scheduled_sso_cleanup()
    RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
    delete_count INTEGER;
BEGIN
    -- First, mark expired sessions as inactive
    SELECT cleanup_expired_sso_sessions() INTO cleanup_count;

    -- Delete sessions that have been inactive for more than 7 days
    DELETE FROM sso_sessions
    WHERE is_active = false
      AND (revoked_at < NOW() - INTERVAL '7 days' OR expires_at < NOW() - INTERVAL '7 days');

    GET DIAGNOSTICS delete_count = ROW_COUNT;

    -- Return total cleanup count
    RETURN cleanup_count + delete_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREATE UTILITY VIEWS
-- =====================================================

-- View for active sessions with additional metadata
CREATE OR REPLACE VIEW active_sso_sessions AS
SELECT
    session_id,
    user_id,
    email,
    permission_level,
    created_at,
    expires_at,
    last_activity,
    ip_address,
    CASE
        WHEN expires_at <= NOW() THEN 'expired'
        WHEN revoked_at IS NOT NULL THEN 'revoked'
        WHEN is_active = false THEN 'inactive'
        ELSE 'active'
        END as session_status,
    EXTRACT(EPOCH FROM (expires_at - NOW())) as seconds_until_expiry,
    game_context
FROM sso_sessions
WHERE is_active = true
  AND revoked_at IS NULL;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on sso_sessions table
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- Policy: Users can view their own sessions
DROP POLICY IF EXISTS "sso_sessions_user_own_view" ON sso_sessions;
CREATE POLICY "sso_sessions_user_own_view" ON sso_sessions
    FOR SELECT USING (
    user_id = get_current_sso_user_id()
    );

-- Policy: Admins can view all sessions
DROP POLICY IF EXISTS "sso_sessions_admin_view" ON sso_sessions;
CREATE POLICY "sso_sessions_admin_view" ON sso_sessions
    FOR SELECT USING (
    is_session_admin()
    );

-- Policy: Users can update their own sessions (for extending, etc.)
DROP POLICY IF EXISTS "sso_sessions_user_own_update" ON sso_sessions;
CREATE POLICY "sso_sessions_user_own_update" ON sso_sessions
    FOR UPDATE USING (
    user_id = get_current_sso_user_id()
    );

-- Policy: Admins can update all sessions
DROP POLICY IF EXISTS "sso_sessions_admin_update" ON sso_sessions;
CREATE POLICY "sso_sessions_admin_update" ON sso_sessions
    FOR UPDATE USING (
    is_session_admin()
    );

-- Policy: Only admins can delete/revoke sessions
DROP POLICY IF EXISTS "sso_sessions_admin_delete" ON sso_sessions;
CREATE POLICY "sso_sessions_admin_delete" ON sso_sessions
    FOR DELETE USING (
    is_session_admin()
    );

-- Policy: Allow session creation (handled by application logic)
DROP POLICY IF EXISTS "sso_sessions_insert" ON sso_sessions;
CREATE POLICY "sso_sessions_insert" ON sso_sessions
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON sso_sessions TO authenticated;
GRANT SELECT ON active_sso_sessions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to service_role for admin operations
GRANT ALL ON sso_sessions TO service_role;
GRANT ALL ON active_sso_sessions TO service_role;

-- =====================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE sso_sessions IS 'Single Sign-On session management table for Ready-or-Not application';
COMMENT ON COLUMN sso_sessions.session_id IS 'Unique session identifier used for SSO token validation';
COMMENT ON COLUMN sso_sessions.user_id IS 'UUID of the authenticated user';
COMMENT ON COLUMN sso_sessions.email IS 'Email address of the authenticated user';
COMMENT ON COLUMN sso_sessions.permission_level IS 'User permission level: super_admin, admin, host, viewer';
COMMENT ON COLUMN sso_sessions.game_context IS 'JSON object containing game-specific session data';
COMMENT ON COLUMN sso_sessions.last_activity IS 'Timestamp of last session activity for tracking';
COMMENT ON COLUMN sso_sessions.ip_address IS 'IP address of the session for security tracking';
COMMENT ON COLUMN sso_sessions.user_agent IS 'User agent string for session identification';

COMMENT ON FUNCTION get_current_sso_user_id() IS 'Returns the user ID for the current SSO session';
COMMENT ON FUNCTION get_current_game_host_id() IS 'Returns the user ID if current session has host privileges';
COMMENT ON FUNCTION is_session_admin() IS 'Returns true if current session has admin privileges';
COMMENT ON FUNCTION cleanup_expired_sso_sessions() IS 'Marks expired sessions as inactive and returns count of cleaned sessions';
COMMENT ON FUNCTION extend_sso_session(VARCHAR, INTEGER) IS 'Extends an active session by specified hours';
COMMENT ON FUNCTION revoke_sso_session(VARCHAR, UUID, TEXT) IS 'Revokes an active session with optional reason';
COMMENT ON FUNCTION create_sso_session(UUID, VARCHAR, VARCHAR, INTEGER, INET, TEXT, JSONB) IS 'Creates a new SSO session and returns session ID';
COMMENT ON FUNCTION scheduled_sso_cleanup() IS 'Scheduled function to cleanup expired and old sessions';

COMMENT ON VIEW active_sso_sessions IS 'View showing all active SSO sessions with computed status and metadata';

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Log successful migration
DO $$
    BEGIN
        RAISE NOTICE 'Migration 20250715034100_create_sso_foundation completed successfully';
        RAISE NOTICE 'SSO foundation tables, functions, and policies created';
        RAISE NOTICE 'Ready for Phase 2: Basic SSO Service Layer';
    END $$;