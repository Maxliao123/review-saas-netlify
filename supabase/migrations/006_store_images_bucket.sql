-- Create public storage bucket for store hero/logo images
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (public survey pages need access)
CREATE POLICY "Public read store images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-images');

-- Authenticated users can upload
CREATE POLICY "Auth upload store images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'store-images' AND auth.role() = 'authenticated');

-- Authenticated users can overwrite their uploads
CREATE POLICY "Auth update store images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'store-images' AND auth.role() = 'authenticated');

-- Authenticated users can delete their uploads
CREATE POLICY "Auth delete store images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'store-images' AND auth.role() = 'authenticated');
