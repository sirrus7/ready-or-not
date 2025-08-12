CREATE OR REPLACE FUNCTION update_user_type_by_email(
    user_email TEXT,
    new_user_type TEXT,
    new_account_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE auth.users
    SET
        raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
            'user_type', new_user_type,
            'account_type', new_account_type,
            'updated_at', NOW()::text
        ),
        updated_at = NOW()
    WHERE email = user_email;

    RETURN FOUND;
END;
$$;
