import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface UploadResult {
  url: string;
  path: string;
}

export function useReceiptUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadReceipt = async (file: File): Promise<UploadResult | null> => {
    if (!user) {
      toast.error('You must be logged in to upload receipts');
      return null;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image (JPEG, PNG, WebP) or PDF.');
      return null;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 5MB.');
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Create unique filename with user folder structure
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${user.id}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get signed URL (receipts bucket is private)
      const { data: urlData } = await supabase.storage
        .from('receipts')
        .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year expiry

      if (!urlData?.signedUrl) {
        throw new Error('Failed to get signed URL');
      }

      setProgress(100);
      
      return {
        url: urlData.signedUrl,
        path: data.path,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast.error(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteReceipt = async (path: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.storage
        .from('receipts')
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      toast.error(message);
      return false;
    }
  };

  const getReceiptUrl = async (path: string): Promise<string | null> => {
    if (!user || !path) return null;

    try {
      const { data } = await supabase.storage
        .from('receipts')
        .createSignedUrl(path, 60 * 60); // 1 hour expiry

      return data?.signedUrl || null;
    } catch {
      return null;
    }
  };

  return {
    uploadReceipt,
    deleteReceipt,
    getReceiptUrl,
    uploading,
    progress,
  };
}
