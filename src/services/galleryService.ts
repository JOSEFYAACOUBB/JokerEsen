import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadToCloudinary, generateCloudinaryUrl } from '../lib/cloudinary';
import type { GalleryImage } from '../types/database';

export const galleryService = {
  uploadImage: async (
    file: File,
    metadata?: { title?: string; description?: string }
  ): Promise<GalleryImage> => {
    // 1. Upload to Cloudinary
    const cloudinaryData = await uploadToCloudinary(file);

    // 2. Save metadata to Supabase
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('gallery_images')
        .insert({
          cloudinary_url: cloudinaryData.secure_url,
          cloudinary_public_id: cloudinaryData.public_id,
          width: cloudinaryData.width,
          height: cloudinaryData.height,
          title: metadata?.title || file.name.replace(/\.[^/.]+$/, ''),
          description: metadata?.description,
        })
        .select()
        .single();

      if (error) {
        console.warn('Could not save to Supabase gallery_images table:', error);
      } else if (data) {
        return {
          ...data,
          display_url: generateCloudinaryUrl(data.cloudinary_public_id, 800),
          thumbnail_url: generateCloudinaryUrl(data.cloudinary_public_id, 400),
        };
      }
    }

    return {
      id: cloudinaryData.public_id || String(Date.now()),
      cloudinary_url: cloudinaryData.secure_url,
      cloudinary_public_id: cloudinaryData.public_id,
      title: metadata?.title || file.name,
      description: metadata?.description,
      display_url: cloudinaryData.secure_url,
      thumbnail_url: cloudinaryData.secure_url,
      created_at: new Date().toISOString(),
    };
  },

  addPhotoByUrl: async (
    url: string,
    metadata?: { title?: string; description?: string }
  ): Promise<GalleryImage> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('gallery_images')
        .insert({
          cloudinary_url: url,
          cloudinary_public_id: url.includes('cloudinary') ? url.split('/').pop()?.split('.')[0] || `url_${Date.now()}` : `custom_${Date.now()}`,
          title: metadata?.title || 'Photo',
          description: metadata?.description,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          ...data,
          display_url: data.cloudinary_url,
          thumbnail_url: data.cloudinary_url,
        };
      }
    }

    return {
      id: String(Date.now()),
      cloudinary_url: url,
      cloudinary_public_id: `custom_${Date.now()}`,
      title: metadata?.title || 'Photo',
      description: metadata?.description,
      display_url: url,
      thumbnail_url: url,
      created_at: new Date().toISOString(),
    };
  },

  fetchImages: async (page: number = 0, pageSize: number = 20) => {
    if (!isSupabaseConfigured) {
      return { images: [], count: 0 };
    }

    const start = page * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await supabase
      .from('gallery_images')
      .select('*', { count: 'exact' })
      .range(start, end)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching gallery images from Supabase:', error);
      return { images: [], count: 0 };
    }

    const imagesWithUrls: GalleryImage[] = (data || []).map((img: any) => ({
      ...img,
      display_url: img.cloudinary_public_id && !img.cloudinary_public_id.startsWith('custom_')
        ? generateCloudinaryUrl(img.cloudinary_public_id, 800)
        : img.cloudinary_url,
      thumbnail_url: img.cloudinary_public_id && !img.cloudinary_public_id.startsWith('custom_')
        ? generateCloudinaryUrl(img.cloudinary_public_id, 400)
        : img.cloudinary_url,
    }));

    return { images: imagesWithUrls, count: count ?? imagesWithUrls.length };
  },

  deleteImage: async (imageId: string) => {
    if (!isSupabaseConfigured) return;

    const { error } = await supabase
      .from('gallery_images')
      .delete()
      .eq('id', imageId);

    if (error) throw error;
  },
};
