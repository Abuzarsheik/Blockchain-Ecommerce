// Image utility functions for consistent NFT image handling

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

// Hash function to create consistent numeric values from strings
const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
};

const generateAbstractArt = (seed, idHash) => {
  // Use Lorem Picsum with specific seeds for consistent abstract images
  return `https://picsum.photos/seed/${seed}${idHash}/400/400?blur=1&grayscale=0`;
};

const generatePixelArt = (seed) => {
  // Use DiceBear for pixel art style
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}&size=400&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd6cc,ffdfba`;
};

const generateGameAsset = (seed, idHash) => {
  // Gaming themed images
  const themes = ['cyberpunk', 'fantasy', 'scifi', 'retro', 'neon'];
  const theme = themes[Math.abs(hashCode(seed)) % themes.length];
  return `https://picsum.photos/seed/gaming${theme}${idHash}/400/400`;
};

const generateMusicVisualization = (seed, idHash) => {
  // Music themed with wave patterns
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&size=400&backgroundColor=667eea,764ba2,f093fb,4facfe&shape1Color=ffffff&shape2Color=f8fafc`;
};

const generatePhotography = (seed, idHash) => {
  // High quality photography
  const photoId = Math.abs(hashCode(seed + idHash)) % 1000 + 1;
  return `https://picsum.photos/id/${photoId}/400/400`;
};

const generateSportsImage = (seed, idHash) => {
  // Sports themed
  return `https://picsum.photos/seed/sports${seed}${idHash}/400/400`;
};

const generateUtilityIcon = (seed) => {
  // Clean geometric shapes for utility NFTs
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}&size=400&backgroundColor=667eea,4f46e5,7c3aed,db2777&shape1Color=ffffff`;
};

const generateGenericArt = (seed, idHash) => {
  // Fallback with artistic blur effect
  return `https://picsum.photos/seed/${seed}${idHash}/400/400?blur=2`;
};

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

// Utility functions for generating NFT images (fallback when no real image)
export const generateNFTImage = (nft) => {
  const { name, category, _id } = nft;
  const seed = name.replace(/\s+/g, '').toLowerCase();
  const idHash = _id ? _id.slice(-8) : Math.random().toString(36).substr(2, 8);
  
  // Different image generation strategies based on category
  const imageGenerators = {
    'digital art': () => generateAbstractArt(seed, idHash),
    'art': () => generateAbstractArt(seed, idHash),
    'collectibles': () => generatePixelArt(seed),
    'gaming': () => generateGameAsset(seed, idHash),
    'music': () => generateMusicVisualization(seed, idHash),
    'photography': () => generatePhotography(seed, idHash),
    'sports': () => generateSportsImage(seed, idHash),
    'utility': () => generateUtilityIcon(seed),
    'default': () => generateGenericArt(seed, idHash)
  };

  const generator = imageGenerators[category.toLowerCase()] || imageGenerators.default;
  return generator();
};

// Fallback images for when external services fail
export const getFallbackImage = (nft) => {
  const colors = [
    '667eea,764ba2', // Purple gradient
    '4facfe,00f2fe', // Blue gradient  
    'a8edea,fed6e3', // Teal to pink
    'ffecd2,fcb69f', // Orange gradient
    'ff9a9e,fecfef', // Pink gradient
    'a18cd1,fbc2eb', // Purple to pink
  ];
  
  const colorPair = colors[Math.abs(hashCode(nft.name)) % colors.length];
  const shortName = nft.name.substring(0, 15) + (nft.name.length > 15 ? '...' : '');
  
  return `https://via.placeholder.com/400x400/${colorPair.replace(',', '/')}/ffffff?text=${encodeURIComponent(shortName)}`;
};

// Create a data URL for a simple gradient background
export const createGradientDataURL = (nft) => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  
  // Create gradient based on NFT name
  const gradient = ctx.createLinearGradient(0, 0, 400, 400);
  const hue1 = Math.abs(hashCode(nft.name)) % 360;
  const hue2 = (hue1 + 60) % 360;
  
  gradient.addColorStop(0, `hsl(${hue1}, 70%, 60%)`);
  gradient.addColorStop(1, `hsl(${hue2}, 70%, 40%)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 400);
  
  // Add some geometric shapes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < 5; i++) {
    const x = (hashCode(nft.name + i) % 300) + 50;
    const y = (hashCode(nft.name + i + 'y') % 300) + 50;
    const radius = (hashCode(nft.name + i + 'r') % 50) + 20;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  return canvas.toDataURL();
};

/**
 * Get the real NFT image URL with fallback to generated image
 * @param {Object} nft - The NFT object
 * @returns {string} - The image URL to use
 */
export const getRealNFTImage = (nft) => {
  // Priority 1: Use the actual uploaded image if available
  if (nft.image_url) {
    return getNFTImageUrl(nft.image_url);
  }
  
  // Priority 2: Use metadata image if available
  if (nft.metadata && nft.metadata.image) {
    return getNFTImageUrl(nft.metadata.image);
  }
  
  // Priority 3: Fall back to generated image
  return generateNFTImage(nft);
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

const imageUtils = {
  getNFTImageUrl,
  getRealNFTImage,
  getPlaceholderImageUrl,
  handleImageError,
  generateNFTImage,
  getFallbackImage,
  createGradientDataURL
};

export default imageUtils; 