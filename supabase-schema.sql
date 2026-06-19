-- Supabase schema for TIGER VVIP

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  customer_name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  product text NOT NULL,
  quantity integer NOT NULL,
  location text NOT NULL,
  priority text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Profiles table for user roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  company text,
  phone text,
  account_type text,
  account_category text,
  role text NOT NULL DEFAULT 'dealer',
  subscription text NOT NULL DEFAULT 'basic',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Buyers table for admin-managed buyer contacts
CREATE TABLE IF NOT EXISTS public.buyers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
