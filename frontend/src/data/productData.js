// Hybrid Product Data System
// This file contains dummy data for demonstration and supports real seller data

// Demo/Sample Products (for UI demonstration)
export const demoProducts = [
  {
    id: 'demo-001',
    name: 'Digital Art Collection #1',
    description: 'A unique digital art piece created by renowned artist. This NFT represents ownership of a high-resolution digital artwork.',
    price: 2.5,
    currency: 'ETH',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
    category: 'art',
    creator: 'ArtistDemo',
    isVerified: true,
    tokenId: 'demo_token_001',
    blockchain: 'Ethereum',
    rarity: 'rare',
    attributes: [
      { trait_type: 'Style', value: 'Abstract' },
      { trait_type: 'Color Scheme', value: 'Vibrant' }
    ],
    isDemoData: true,
    createdAt: '2024-01-15T10:00:00Z',
    views: 1250,
    likes: 89
  },
  {
    id: 'demo-002',
    name: 'Crypto Collectible #47',
    description: 'Limited edition collectible from the popular CryptoWorld series. Only 100 pieces available.',
    price: 1.8,
    currency: 'ETH',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500',
    category: 'collectibles',
    creator: 'CryptoWorld',
    isVerified: true,
    tokenId: 'demo_token_002',
    blockchain: 'Ethereum',
    rarity: 'epic',
    attributes: [
      { trait_type: 'Series', value: 'Gen 1' },
      { trait_type: 'Number', value: '47' }
    ],
    isDemoData: true,
    createdAt: '2024-01-20T14:30:00Z',
    views: 890,
    likes: 156
  },
  {
    id: 'demo-003',
    name: 'Virtual Real Estate Plot',
    description: 'Prime virtual land in the metaverse. Perfect for building your digital empire.',
    price: 5.2,
    currency: 'ETH',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500',
    category: 'virtual-worlds',
    creator: 'MetaLands',
    isVerified: true,
    tokenId: 'demo_token_003',
    blockchain: 'Polygon',
    rarity: 'legendary',
    attributes: [
      { trait_type: 'Location', value: 'Central District' },
      { trait_type: 'Size', value: '1000 sqm' }
    ],
    isDemoData: true,
    createdAt: '2024-01-25T09:15:00Z',
    views: 2100,
    likes: 278
  }
];

// Categories for products
export const productCategories = [
  { id: 'art', name: 'Digital Art', icon: '🎨' },
  { id: 'collectibles', name: 'Collectibles', icon: '🎭' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'virtual-worlds', name: 'Virtual Worlds', icon: '🌐' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'photography', name: 'Photography', icon: '📸' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'utility', name: 'Utility', icon: '🔧' }
];

// Real seller products (initially empty, populated when sellers add products)
export let sellerProducts = [];

// Combined product management
export const productManager = {
  // Get all products (demo + seller)
  getAllProducts: () => {
    return [...demoProducts, ...sellerProducts];
  },

  // Get only demo products
  getDemoProducts: () => {
    return demoProducts;
  },

  // Get only seller products
  getSellerProducts: () => {
    return sellerProducts;
  },

  // Add new seller product
  addSellerProduct: (product) => {
    const newProduct = {
      ...product,
      id: `seller-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isDemoData: false,
      createdAt: new Date().toISOString(),
      views: 0,
      likes: 0,
      isVerified: false // Seller products start unverified
    };
    sellerProducts.push(newProduct);
    return newProduct;
  },

  // Update seller product
  updateSellerProduct: (productId, updates) => {
    const index = sellerProducts.findIndex(p => p.id === productId);
    if (index !== -1) {
      sellerProducts[index] = { ...sellerProducts[index], ...updates };
      return sellerProducts[index];
    }
    return null;
  },

  // Delete seller product
  deleteSellerProduct: (productId) => {
    const index = sellerProducts.findIndex(p => p.id === productId);
    if (index !== -1) {
      return sellerProducts.splice(index, 1)[0];
    }
    return null;
  },

  // Get products by category
  getProductsByCategory: (category) => {
    const allProducts = [...demoProducts, ...sellerProducts];
    return allProducts.filter(product => product.category === category);
  },

  // Search products
  searchProducts: (query) => {
    const allProducts = [...demoProducts, ...sellerProducts];
    const searchTerm = query.toLowerCase();
    return allProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm) ||
      product.creator.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
    );
  },

  // Get product by ID
  getProductById: (id) => {
    const allProducts = [...demoProducts, ...sellerProducts];
    return allProducts.find(product => product.id === id);
  },

  // Sort products
  sortProducts: (products, sortBy = 'newest') => {
    const sorted = [...products];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'popular':
        return sorted.sort((a, b) => (b.views + b.likes) - (a.views + a.likes));
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  },

  // Filter products
  filterProducts: (products, filters = {}) => {
    let filtered = [...products];

    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    if (filters.priceMin !== undefined) {
      filtered = filtered.filter(p => p.price >= filters.priceMin);
    }

    if (filters.priceMax !== undefined) {
      filtered = filtered.filter(p => p.price <= filters.priceMax);
    }

    if (filters.verified !== undefined) {
      filtered = filtered.filter(p => p.isVerified === filters.verified);
    }

    if (filters.blockchain) {
      filtered = filtered.filter(p => p.blockchain === filters.blockchain);
    }

    if (filters.rarity) {
      filtered = filtered.filter(p => p.rarity === filters.rarity);
    }

    if (filters.isDemoData !== undefined) {
      filtered = filtered.filter(p => p.isDemoData === filters.isDemoData);
    }

    return filtered;
  },

  // Get statistics
  getStats: () => {
    const allProducts = [...demoProducts, ...sellerProducts];
    return {
      totalProducts: allProducts.length,
      demoProducts: demoProducts.length,
      sellerProducts: sellerProducts.length,
      totalValue: allProducts.reduce((sum, p) => sum + p.price, 0),
      verifiedProducts: allProducts.filter(p => p.isVerified).length,
      categories: productCategories.length,
      totalViews: allProducts.reduce((sum, p) => sum + p.views, 0),
      totalLikes: allProducts.reduce((sum, p) => sum + p.likes, 0)
    };
  }
};

export default productManager; 