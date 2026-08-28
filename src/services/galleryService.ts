import { supabase } from '../lib/supabase';
import { uploadToCloudinary, generateCloudinaryUrl } from '../lib/cloudinary';
import type { GalleryImage } from '../types/database';

export const galleryService = {
  uploadImage: async (
    file: File,
    metadata?: { title?: string; description?: string }
  ): Promise<GalleryImage> => {
    // Upload to Cloudinary
    const cloudinaryData = await uploadToCloudinary(file);

    // Save to Supabase
    const { data, error } = await supabase
      .from('gallery_images')
      .insert({
        cloudinary_url: cloudinaryData.secure_url,
        cloudinary_public_id: cloudinaryData.public_id,
        width: cloudinaryData.width,
        height: cloudinaryData.height,
        title: metadata?.title || file.name,
        description: metadata?.description,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  fetchImages: async (page: number = 0, pageSize: number = 20) => {
    const start = page * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await supabase
      .from('gallery_images')
      .select('*', { count: 'exact' })
      .range(start, end)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const imagesWithUrls: GalleryImage[] = (data || []).map((img: any) => ({
      ...img,
      display_url: img.cloudinary_public_id
        ? generateCloudinaryUrl(img.cloudinary_public_id, 400)
        : img.cloudinary_url,
      thumbnail_url: img.cloudinary_public_id
        ? generateCloudinaryUrl(img.cloudinary_public_id, 200)
        : img.cloudinary_url,
    }));

    return { images: imagesWithUrls, count: count ?? imagesWithUrls.length };
  },

  deleteImage: async (imageId: string) => {
    const { error } = await supabase
      .from('gallery_images')
      .delete()
      .eq('id', imageId);

    if (error) throw error;
  },
};
