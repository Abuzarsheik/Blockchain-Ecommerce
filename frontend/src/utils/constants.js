/**
 * Frontend constants that mirror backend configuration
 * This ensures consistency between frontend and backend
 */

// Product categories - must match backend PRODUCT_CATEGORY_ENUM
export const PRODUCT_CATEGORIES = {
  ELECTRONICS: 'electronics',
  CLOTHING: 'clothing',
  HOME_GARDEN: 'home-garden',
  SPORTS: 'sports',
  BOOKS: 'books',
  BEAUTY: 'beauty',
  TOYS: 'toys',
  AUTOMOTIVE: 'automotive',
  JEWELRY: 'jewelry',
  ART_COLLECTIBLES: 'art-collectibles',
  OFFICE_SUPPLIES: 'office-supplies',
  OTHER: 'other'
};

// Product category labels - must match backend PRODUCT_CATEGORY_LABELS
export const PRODUCT_CATEGORY_LABELS = {
  [PRODUCT_CATEGORIES.ELECTRONICS]: 'Electronics',
  [PRODUCT_CATEGORIES.CLOTHING]: 'Clothing & Fashion',
  [PRODUCT_CATEGORIES.HOME_GARDEN]: 'Home & Garden',
  [PRODUCT_CATEGORIES.SPORTS]: 'Sports & Outdoors',
  [PRODUCT_CATEGORIES.BOOKS]: 'Books & Media',
  [PRODUCT_CATEGORIES.BEAUTY]: 'Beauty & Personal Care',
  [PRODUCT_CATEGORIES.TOYS]: 'Toys & Games',
  [PRODUCT_CATEGORIES.AUTOMOTIVE]: 'Automotive',
  [PRODUCT_CATEGORIES.JEWELRY]: 'Jewelry & Accessories',
  [PRODUCT_CATEGORIES.ART_COLLECTIBLES]: 'Art & Collectibles',
  [PRODUCT_CATEGORIES.OFFICE_SUPPLIES]: 'Office Supplies',
  [PRODUCT_CATEGORIES.OTHER]: 'Other'
};

// Helper function to get category options for select components
export const getCategoryOptions = () => {
  return Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label
  }));
};

// Product status options
export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued'
};

export const PRODUCT_STATUS_LABELS = {
  [PRODUCT_STATUS.DRAFT]: 'Draft',
  [PRODUCT_STATUS.ACTIVE]: 'Active',
  [PRODUCT_STATUS.INACTIVE]: 'Inactive',
  [PRODUCT_STATUS.OUT_OF_STOCK]: 'Out of Stock',
  [PRODUCT_STATUS.DISCONTINUED]: 'Discontinued'
};

// Order status options
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  READY_TO_SHIP: 'ready_to_ship',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed'
};

// Default export for convenience
const constants = {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  getCategoryOptions,
  PRODUCT_STATUS,
  PRODUCT_STATUS_LABELS,
  ORDER_STATUS
};

export default constants; 