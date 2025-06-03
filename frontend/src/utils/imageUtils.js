// Image utility functions for consistent NFT image handling

/**
 * Image utilities for the Blocmerce frontend
 */

// Data URI placeholders to avoid external dependencies
const createSVGPlaceholder = (width, height, text, bgColor = '#f0f0f0', textColor = '#666') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${bgColor}"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="${textColor}" text-anchor="middle" dy="0.3em">${text}</text>
  </svg>`;
  
  // Use btoa with proper Unicode handling
  try {
    // Convert Unicode to UTF-8 bytes that btoa can handle
    const utf8Svg = unescape(encodeURIComponent(svg));
    return `data:image/svg+xml;base64,${btoa(utf8Svg)}`;
  } catch (error) {
    // Fallback: use encodeURIComponent if btoa fails
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
};

/**
 * Get NFT image URL with fallback
 * @param {string} imageUrl - Original image URL
 * @returns {string} Image URL or fallback
 */
export const getNFTImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return createSVGPlaceholder(400, 400, 'NFT Image');
  }
  
  // Handle different URL formats
  if (typeof imageUrl === 'string') {
    // If it's already a complete URL, return it
    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    
    // If it's a relative path, prepend the API base URL
    if (imageUrl.startsWith('/')) {
      return `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${imageUrl}`;
    }
    
    // If it's just a filename, assume it's in uploads
    return `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/uploads/${imageUrl}`;
  }
  
  // If it's an object with url property
  if (imageUrl && typeof imageUrl === 'object' && imageUrl.url) {
    return getNFTImageUrl(imageUrl.url);
  }
  
  return createSVGPlaceholder(400, 400, 'NFT Image');
};

/**
 * Generate placeholder image URL
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} text - Placeholder text
 * @returns {string} Placeholder image URL
 */
export const generatePlaceholder = (width = 400, height = 400, text = 'Image') => {
  return createSVGPlaceholder(width, height, text);
};

/**
 * Handle image loading errors
 * @param {Event} event - Image error event
 * @param {string} fallbackText - Text for fallback image
 */
export const handleImageError = (event, fallbackText = 'No Image') => {
  if (event.target && event.target.tagName === 'IMG') {
    // Prevent infinite loop by checking if already showing placeholder
    if (!event.target.src.startsWith('data:image/svg+xml')) {
      const { width = 400, height = 400 } = event.target;
      event.target.src = createSVGPlaceholder(
        width || 400, 
        height || 400, 
        fallbackText
      );
    }
  }
};

/**
 * Generate user avatar with initials and gradient background
 * @param {string} username - User's name
 * @param {number} size - Avatar size
 * @returns {string} Data URL for the avatar
 */
export const generateUserAvatar = (username = 'User', size = 120) => {
  const colors = [
    ['#FF6B6B', '#4ECDC4'],
    ['#45B7D1', '#96CEB4'],
    ['#FECA57', '#FF9FF3'],
    ['#54A0FF', '#5F27CD'],
    ['#00D2D3', '#FF9F43'],
    ['#F8C291', '#6C5CE7']
  ];
  
  const shortName = username.split(' ').map(n => n[0]).join('').toUpperCase();
  const colorIndex = shortName.charCodeAt(0) % colors.length;
  const [bgColor, textColor] = colors[colorIndex];
  
  return createSVGPlaceholder(size, size, shortName, bgColor, textColor);
};

/**
 * Create product placeholder
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} category - Product category
 * @returns {string} Product placeholder URL
 */
export const createProductPlaceholder = (width = 300, height = 300, category = 'Product') => {
  // Use text labels instead of emojis to avoid Unicode issues
  const labels = {
    'electronics': 'TECH',
    'clothing': 'WEAR',
    'home-garden': 'HOME',
    'sports': 'SPORT',
    'books': 'BOOK',
    'beauty': 'BEAUTY',
    'toys': 'TOY',
    'automotive': 'AUTO',
    'jewelry': 'GEM',
    'art-collectibles': 'ART',
    'office-supplies': 'OFFICE',
    'other': 'ITEM'
  };
  
  const label = labels[category] || 'PRODUCT';
  return createSVGPlaceholder(width, height, label, '#f8f9fa', '#6c757d');
};

/**
 * Get image URL with proper fallback
 * @param {string} imagePath - Image path
 * @param {string} fallbackText - Fallback text
 * @returns {string} Image URL
 */
export const getImageUrl = (imagePath, fallbackText = 'Image') => {
  if (!imagePath) {
    return createSVGPlaceholder(400, 400, fallbackText);
  }
  
  if (imagePath.startsWith('data:') || imagePath.startsWith('http')) {
    return imagePath;
  }
  
  if (imagePath.startsWith('/')) {
    return `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${imagePath}`;
  }
  
  return `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/uploads/${imagePath}`;
};

/**
 * Create gradient data URL for backgrounds
 * @param {Array} colors - Array of color stops
 * @param {string} direction - Gradient direction
 * @returns {string} Data URL
 */
export const createGradientDataURL = (colors = ['#667eea', '#764ba2'], direction = 'to right') => {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createLinearGradient(0, 0, 100, 0);
  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color);
  });
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 100, 100);
  
  return canvas.toDataURL();
};

/**
 * Generate NFT-style image with metadata
 * @param {Object} nft - NFT metadata
 * @returns {string} Generated image URL
 */
export const generateNFTImage = (nft) => {
  const traits = nft.attributes || [];
  const rarity = nft.rarity || 'common';
  
  // Create a unique visual based on traits
  const traitHash = traits.map(t => `${t.trait_type}:${t.value}`).join('|');
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
  const bgColor = colors[traitHash.length % colors.length];
  
  return createSVGPlaceholder(300, 300, `${nft.name || 'NFT'}\n${rarity.toUpperCase()}`, bgColor, '#ffffff');
};

/**
 * Get fallback image for when primary fails
 * @param {string} type - Type of fallback needed
 * @returns {string} Fallback image URL
 */
export const getFallbackImage = (type = 'general') => {
  const fallbacks = {
    user: createSVGPlaceholder(120, 120, 'USER', '#e9ecef', '#6c757d'),
    product: createSVGPlaceholder(300, 300, 'PRODUCT', '#f8f9fa', '#6c757d'),
    nft: createSVGPlaceholder(400, 400, 'NFT', '#f1f3f4', '#5f6368'),
    avatar: createSVGPlaceholder(80, 80, 'AVATAR', '#e3f2fd', '#1976d2'),
    general: createSVGPlaceholder(400, 400, 'IMAGE', '#f5f5f5', '#757575')
  };
  
  return fallbacks[type] || fallbacks.general;
};

/**
 * Get real NFT image or fallback
 * @param {Object} nft - NFT object
 * @returns {string} Image URL
 */
export const getRealNFTImage = (nft) => {
  if (nft?.image) {
    return getNFTImageUrl(nft.image);
  }
  
  if (nft?.metadata?.image) {
    return getNFTImageUrl(nft.metadata.image);
  }
  
  return generateNFTImage(nft);
};

const imageUtils = {
  getNFTImageUrl,
  getRealNFTImage,
  getPlaceholderImageUrl: generatePlaceholder,
  handleImageError,
  generateNFTImage,
  getFallbackImage,
  createGradientDataURL,
  generatePlaceholder,
  generateUserAvatar,
  createProductPlaceholder,
  getImageUrl
};

export default imageUtils; 