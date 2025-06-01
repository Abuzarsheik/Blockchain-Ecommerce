
// Cart utility functions

/**
 * Migrate cart data from old format to new format if needed
 * @param {Object} cartData - The cart data from localStorage
 * @returns {Object} - Migrated cart data
 */
export const migrateCartData = (cartData) => {
  if (!cartData) return null;
  
  // Ensure all required fields exist
  const migratedData = {
    items: cartData.items || [],
    subtotal: cartData.subtotal || 0,
    discount: cartData.discount || 0,
    tax: cartData.tax || 0,
    shipping: cartData.shipping || 0,
    total: cartData.total || 0,
    itemCount: cartData.itemCount || 0,
    coupon: cartData.coupon || null,
    shippingMethod: cartData.shippingMethod || 'standard'
  };
  
  // Ensure each item has all required fields
  migratedData.items = migratedData.items.map(item => ({
    productId: item.productId,
    name: item.name || 'Unknown Item',
    image: item.image || null,
    category: item.category || 'Uncategorized',
    price: item.price || 0,
    originalPrice: item.originalPrice || item.price || 0,
    quantity: item.quantity || 1,
    isVerified: item.isVerified || false,
    isDigital: item.isDigital || false,
    stock: item.stock || 999
  }));
  
  return migratedData;
};

/**
 * Validate cart item before adding
 * @param {Object} item - The cart item to validate
 * @returns {boolean} - Whether the item is valid
 */
export const validateCartItem = (item) => {
  return (
    item &&
    item.productId &&
    item.name &&
    typeof item.price === 'number' &&
    item.price >= 0 &&
    typeof item.quantity === 'number' &&
    item.quantity > 0
  );
};

/**
 * Clean up cart data by removing invalid items
 * @param {Array} items - Cart items array
 * @returns {Array} - Cleaned cart items
 */
export const cleanCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  
  return items.filter(validateCartItem);
};

const cartUtils = {
  migrateCartData,
  validateCartItem,
  cleanCartItems
};

export default cartUtils; 