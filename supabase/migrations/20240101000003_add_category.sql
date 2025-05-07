-- Add category column to announcements table
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';

-- Create an index on the category column for better query performance
CREATE INDEX IF NOT EXISTS idx_announcements_category ON public.announcements(category); 