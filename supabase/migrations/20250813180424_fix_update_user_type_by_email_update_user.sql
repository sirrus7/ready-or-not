-- Enhanced RPC function to handle role transitions
CREATE OR REPLACE FUNCTION update_user_type_by_email(
    user_email TEXT,
    new_user_type TEXT,
    new_account_type TEXT,
    p_role TEXT DEFAULT NULL,
    p_global_user_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
current_role TEXT;
    final_role TEXT;
BEGIN
    -- Get current role if exists
SELECT raw_user_meta_data->>'role' INTO current_role
FROM auth.users
WHERE email = user_email;

-- Determine final role
IF p_role IS NOT NULL THEN
        -- Explicit role provided (from admin access)
        final_role := p_role;
    ELSIF new_user_type = 'business' AND current_role = 'host' THEN
        -- Business type access by existing host = promote to admin
        final_role := 'admin';
ELSE
        -- Keep existing role or default to host
        final_role := COALESCE(current_role, 'host');
END IF;

    -- Update user metadata
UPDATE auth.users
SET
    raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
            'user_type', new_user_type,
            'account_type', new_account_type,
            'role', final_role,
            'global_user_id', COALESCE(p_global_user_id, raw_user_meta_data->>'global_user_id'),
            'last_access_type', new_user_type,
            'last_access_role', final_role,
            'updated_at', NOW()::text
                                               ),
    updated_at = NOW()
WHERE email = user_email;

RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_user_type_by_email(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
