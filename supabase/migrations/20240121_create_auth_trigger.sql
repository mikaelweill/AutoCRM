-- First, drop any existing triggers/functions we're replacing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role text;
BEGIN
    -- Get the role from raw_app_meta_data
    user_role := NEW.raw_app_meta_data->>'role';
    
    -- If no role is set, default to 'client'
    IF user_role IS NULL THEN
        user_role := 'client';
    END IF;

    -- Step 1: Create corresponding record in public.users
    INSERT INTO public.users (
        id,
        email,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        user_role,  -- Use the role from auth metadata
        NEW.created_at,
        NEW.updated_at
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after INSERT on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user(); 