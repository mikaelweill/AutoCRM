-- Insert initial admin user
-- Note: Replace these values with actual admin details
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  'c9c2f872-7730-4bf1-9a15-c76e1afc033c', -- fixed UUID for reproducibility
  'admin@autocrm.com',
  crypt('admin123', gen_salt('bf')), -- You should change this password
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"],"role":"admin"}',
  '{"full_name":"System Admin"}'
);

-- Create corresponding user record in our users table
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  'c9c2f872-7730-4bf1-9a15-c76e1afc033c', -- same UUID as auth.users
  'admin@autocrm.com',
  'System Admin',
  'admin',
  now(),
  now()
); 