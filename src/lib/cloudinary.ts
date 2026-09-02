export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'joker_esen_unsigned',
};

export const optimizeCloudinaryUrl = (
  url?: string | null,
  options: {
    width?: number;
    height?: number;
    quality?: number | 'auto';
    format?: 'auto' | 'webp' | 'avif';
    crop?: 'fill' | 'scale' | 'limit' | 'fit';
  } = {}
): string => {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com')) return url;

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'limit',
  } = options;

  const transforms: string[] = [`f_${format}`, `q_${quality}`];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  const transformStr = transforms.join(',');

  // If already contains optimization params, return as is
  if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/q_auto')) {
    return url;
  }

  // Insert transformations right after /image/upload/
  return url.replace('/image/upload/', `/image/upload/${transformStr}/`);
};

export const generateCloudinaryUrl = (
  publicId: string,
  width: number = 400,
  quality: number = 75
): string => {
  if (!CLOUDINARY_CONFIG.cloudName) {
    return publicId.startsWith('http') ? publicId : `/images/${publicId}`;
  }
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_${width},q_${quality},f_auto,c_fill/${publicId}`;
};

export const uploadToCloudinary = async (file: File) => {
  if (!CLOUDINARY_CONFIG.cloudName) {
    throw new Error('Cloudinary cloud name is missing. Please set VITE_CLOUDINARY_CLOUD_NAME in .env.local');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Cloudinary upload failed');
  }

  return response.json();
};
