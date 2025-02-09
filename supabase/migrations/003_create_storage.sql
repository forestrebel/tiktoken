-- Create videos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/x-m4v', 'application/octet-stream'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage policies
CREATE POLICY "Anyone can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Anyone can download" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos'); 