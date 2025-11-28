import { UploadedImage } from '../types';

/**
 * Reads a file and converts it to a base64 string, while also
 * normalizing the width to a standard size (e.g., 1200px) to ensure
 * consistency between design and dev screenshots for the overlay.
 */
export const processImage = (file: File, targetWidth = 1200): Promise<UploadedImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleFactor = targetWidth / img.width;
        
        canvas.width = targetWidth;
        canvas.height = img.height * scaleFactor;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, targetWidth, canvas.height);
        
        resolve({
          src: canvas.toDataURL('image/jpeg', 0.9), // Compress slightly
          width: targetWidth,
          height: canvas.height,
          file: file
        });
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const cleanBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

/**
 * Applies visual transformations (scale, translate) to an image and returns the new base64 string.
 * This is used to align the design image to the dev image before sending to AI.
 */
export const getTransformedImage = (
  src: string,
  scale: number,
  x: number,
  y: number,
  targetWidth: number,
  targetHeight: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Fill with background color to avoid transparency issues
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply transformations (Origin is top-left)
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, img.width, img.height);
      ctx.restore();

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = src;
  });
};