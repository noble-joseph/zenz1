/**
 * Cloudinary Utility
 * Generates optimized URLs for images stored in Cloudinary.
 */

export function getOptimizedCloudinaryUrl(url: string | null | undefined, options: { width?: number; height?: number; crop?: string } = {}) {
  if (!url) return "";
  
  // If it's already a Cloudinary URL, we can inject optimization parameters
  if (url.includes("res.cloudinary.com")) {
    const parts = url.split("/upload/");
    if (parts.length === 2) {
      const transformations = [];
      
      // Auto-format and auto-quality are standard for performance
      transformations.push("f_auto", "q_auto");
      
      if (options.width) transformations.push(`w_${options.width}`);
      if (options.height) transformations.push(`h_${options.height}`);
      if (options.crop) transformations.push(`c_${options.crop}`);
      
      return `${parts[0]}/upload/${transformations.join(",")}/${parts[1]}`;
    }
  }
  
  return url;
}
