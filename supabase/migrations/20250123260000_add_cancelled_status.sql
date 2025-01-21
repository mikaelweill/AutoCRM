-- Add 'cancelled' to ticket_status enum
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'cancelled'; 