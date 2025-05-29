// Image utility functions for consistent NFT image handling

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Get the full URL for an NFT image
 * @param {string} imagePath - The image path from the NFT data
 * @returns {string} - The full URL to the image
 */
export const getNFTImageUrl = (imagePath) => {
  if (!imagePath) {
    return 'https://via.placeholder.com/400x400?text=NFT+Image';
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's an upload path, construct the full URL
  if (imagePath.startsWith('/uploads/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  
  // For other cases, assume it's a relative path
  return `${API_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

/**
 * Get a placeholder image URL
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} text - Placeholder text
 * @returns {string} - Placeholder image URL
 */
export const getPlaceholderImageUrl = (width = 400, height = 400, text = 'No Image') => {
  return `https://via.placeholder.com/${width}x${height}?text=${encodeURIComponent(text)}`;
};

/**
 * Handle image error by setting a fallback
 * @param {Event} event - The error event
 * @param {string} fallbackUrl - Optional custom fallback URL
 */
export const handleImageError = (event, fallbackUrl = null) => {
  const fallback = fallbackUrl || getPlaceholderImageUrl();
  event.target.src = fallback;
};

export default {
  getNFTImageUrl,
  getPlaceholderImageUrl,
  handleImageError
}; 