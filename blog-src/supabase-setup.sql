-- Run this in Supabase SQL Editor to create the newsletter subscribers table

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  lang text NOT NULL DEFAULT 'ko' CHECK (lang IN ('ko', 'en')),
  source text NOT NULL DEFAULT 'blog',
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);

-- RLS: disable public read, allow service role writes only
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- No public access (API uses service role key)
-- If you want to allow anon inserts, add a policy:
-- CREATE POLICY "Allow anon insert" ON newsletter_subscribers FOR INSERT TO anon WITH CHECK (true);
