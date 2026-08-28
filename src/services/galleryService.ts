import { supabase, supabaseDb, isSupabaseConfigured } from '../lib/supabase';
import { uploadToCloudinary, generateCloudinaryUrl } from '../lib/cloudinary';
import type { GalleryImage } from '../types/database';

const LOCAL_STORAGE_GALLERY_KEY = 'joker_gallery_cache';

export function getCachedGallery(): GalleryImage[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached gallery:', e);
  }
  return [];
}

export function cacheGallery(images: GalleryImage[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_GALLERY_KEY, JSON.stringify(images));
  } catch (e) {
    console.warn('Could not write cached gallery:', e);
  }
}

export const galleryService = {
  uploadImage: async (
    file: File,
    metadata?: { title?: string; description?: string }
  ): Promise<GalleryImage> => {
    // 1. Upload to Cloudinary
    const cloudinaryData = await uploadToCloudinary(file);

    let savedItem: GalleryImage = {
      id: cloudinaryData.public_id || String(Date.now()),
      cloudinary_url: cloudinaryData.secure_url,
      cloudinary_public_id: cloudinaryData.public_id,
      title: metadata?.title || file.name,
      description: metadata?.description,
      display_url: cloudinaryData.secure_url,
      thumbnail_url: cloudinaryData.secure_url,
      created_at: new Date().toISOString(),
    };

    // 2. Save metadata to Supabase
    if (isSupabaseConfigured) {
      try {
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

        if (!error && data) {
          savedItem = {
            ...data,
            display_url: generateCloudinaryUrl(data.cloudinary_public_id, 800),
            thumbnail_url: generateCloudinaryUrl(data.cloudinary_public_id, 400),
          };
        }
      } catch (e) {
        console.warn('Could not save to Supabase gallery_images table:', e);
      }
    }

    const currentCached = getCachedGallery();
    cacheGallery([savedItem, ...currentCached]);

    return savedItem;
  },

  addPhotoByUrl: async (
    url: string,
    metadata?: { title?: string; description?: string }
  ): Promise<GalleryImage> => {
    let savedItem: GalleryImage = {
      id: String(Date.now()),
      cloudinary_url: url,
      cloudinary_public_id: `custom_${Date.now()}`,
      title: metadata?.title || 'Photo',
      description: metadata?.description,
      display_url: url,
      thumbnail_url: url,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
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
          savedItem = {
            ...data,
            display_url: data.cloudinary_url,
            thumbnail_url: data.cloudinary_url,
          };
        }
      } catch (e) {
        console.warn('Error adding photo by URL to Supabase:', e);
      }
    }

    const currentCached = getCachedGallery();
    cacheGallery([savedItem, ...currentCached]);

    return savedItem;
  },

  fetchImages: async (page: number = 0, pageSize: number = 50) => {
    const cached = getCachedGallery();

    if (!isSupabaseConfigured) {
      return { images: cached, count: cached.length };
    }

    const start = page * pageSize;
    const end = start + pageSize - 1;

    try {
      const { data, error, count } = await supabase
        .from('gallery_images')
        .select('*', { count: 'exact' })
        .range(start, end)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching gallery images from Supabase:', error);
        return { images: cached, count: cached.length };
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

      if (page === 0) {
        cacheGallery(imagesWithUrls);
      }

      return { images: imagesWithUrls, count: count ?? imagesWithUrls.length };
    } catch (e) {
      console.warn('Exception fetching gallery images:', e);
      return { images: cached, count: cached.length };
    }
  },

  deleteImage: async (imageId: string) => {
    const cached = getCachedGallery();
    const filtered = cached.filter((img) => img.id !== imageId && img.cloudinary_public_id !== imageId);
    cacheGallery(filtered);

    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .eq('id', imageId);

      if (error) {
        // Also try delete by cloudinary_public_id
        await supabase
          .from('gallery_images')
          .delete()
          .eq('cloudinary_public_id', imageId);
      }
    } catch (e) {
      console.warn('Exception deleting gallery image from Supabase via SDK:', e);
    }

    // REST fallback
    try {
      await supabaseDb.gallery.delete(imageId);
    } catch (err) {
      console.warn('REST delete gallery image error:', err);
    }
  },
};
