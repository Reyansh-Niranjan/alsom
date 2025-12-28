-- RLS Policies for Storage Bucket 'documents'
-- Run this in your Supabase SQL Editor

-- 1. Create policies for the 'documents' storage bucket
-- (Assumes the bucket 'documents' already exists)

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Detailed Auth Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own files
CREATE POLICY "Detailed Auth Select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Detailed Auth Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
