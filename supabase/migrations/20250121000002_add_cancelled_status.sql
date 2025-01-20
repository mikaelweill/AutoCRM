-- Add cancelled to ticket_status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
        WHERE typname = 'ticket_status'
        AND enumlabel = 'cancelled'
    ) THEN
        ALTER TYPE ticket_status ADD VALUE 'cancelled';
    END IF;
END
$$; 