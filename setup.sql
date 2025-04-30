-- Function to check if a policy exists
CREATE OR REPLACE FUNCTION policy_exists(
  policy_name text,
  table_name text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = policy_name
    AND tablename = table_name
  );
END;
$$ LANGUAGE plpgsql;

-- Create the announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on announcements table
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    IF policy_exists('Allow authenticated users to create announcements', 'announcements') THEN
        DROP POLICY "Allow authenticated users to create announcements" ON announcements;
    END IF;
    
    IF policy_exists('Allow users to update own announcements', 'announcements') THEN
        DROP POLICY "Allow users to update own announcements" ON announcements;
    END IF;
    
    IF policy_exists('Allow users to delete own announcements', 'announcements') THEN
        DROP POLICY "Allow users to delete own announcements" ON announcements;
    END IF;
    
    IF policy_exists('Allow everyone to read announcements', 'announcements') THEN
        DROP POLICY "Allow everyone to read announcements" ON announcements;
    END IF;
END $$;

-- Create new policies
CREATE POLICY "Allow authenticated users to create announcements"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update own announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete own announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow everyone to read announcements"
ON public.announcements
FOR SELECT
TO public
USING (true);

-- Storage setup
DO $$ 
BEGIN
    -- Create storage schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS storage;
    
    -- Create the buckets table if it doesn't exist
    CREATE TABLE IF NOT EXISTS storage.buckets (
        id text PRIMARY KEY,
        name text NOT NULL,
        owner uuid REFERENCES auth.users,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW(),
        public boolean DEFAULT FALSE
    );

    -- Create the objects table if it doesn't exist
    CREATE TABLE IF NOT EXISTS storage.objects (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        bucket_id text REFERENCES storage.buckets(id),
        name text NOT NULL,
        owner uuid REFERENCES auth.users,
        created_at timestamptz DEFAULT NOW(),
        updated_at timestamptz DEFAULT NOW(),
        last_accessed_at timestamptz DEFAULT NOW(),
        metadata jsonb DEFAULT '{}'::jsonb,
        path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
    );
END $$;

-- Enable RLS on storage tables
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop existing storage policies if they exist
DO $$ 
BEGIN
    IF policy_exists('Give users access to own bucket', 'buckets') THEN
        DROP POLICY "Give users access to own bucket" ON storage.buckets;
    END IF;
    
    IF policy_exists('Give users access to own objects', 'objects') THEN
        DROP POLICY "Give users access to own objects" ON storage.objects;
    END IF;
    
    IF policy_exists('Allow authenticated users to upload to announcements', 'objects') THEN
        DROP POLICY "Allow authenticated users to upload to announcements" ON storage.objects;
    END IF;
    
    IF policy_exists('Allow public to read announcements', 'objects') THEN
        DROP POLICY "Allow public to read announcements" ON storage.objects;
    END IF;
END $$;

-- Create storage policies
CREATE POLICY "Give users access to own bucket"
ON storage.buckets
FOR ALL
TO authenticated
USING (owner = auth.uid());

CREATE POLICY "Give users access to own objects"
ON storage.objects
FOR ALL
TO authenticated
USING (owner = auth.uid());

-- Create the announcements bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

-- Create announcements bucket policies
CREATE POLICY "Allow authenticated users to upload to announcements"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'announcements'
    AND (COALESCE(owner, auth.uid()) = auth.uid())
);

CREATE POLICY "Allow public to read announcements"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'announcements'); 