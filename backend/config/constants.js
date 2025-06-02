/**
 * CENTRALIZED CONSTANTS FOR BLOCMERCE
 * Eliminates redundant enums and configurations
 */

// ============================================
// PRODUCT CATEGORIES
// ============================================
const PRODUCT_CATEGORIES = {
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

const PRODUCT_CATEGORY_LABELS = {
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

const PRODUCT_CATEGORY_ENUM = Object.values(PRODUCT_CATEGORIES);

// ============================================
// STATUS ENUMS
// ============================================
const PRODUCT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued'
};

const ORDER_STATUS = {
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

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded'
};

const DISPUTE_STATUS = {
  OPEN: 'open',
  UNDER_REVIEW: 'under_review',
  AWAITING_RESPONSE: 'awaiting_response',
  ESCALATED: 'escalated',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

const KYC_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  READ: 'read',
  EXPIRED: 'expired'
};

// ============================================
// USER TYPES AND ROLES
// ============================================
const USER_TYPES = {
  BUYER: 'buyer',
  SELLER: 'seller'
};

const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

// ============================================
// PAYMENT METHODS
// ============================================
const PAYMENT_METHODS = {
  CARD: 'card',
  CRYPTO: 'crypto',
  ESCROW: 'escrow'
};

// ============================================
// SHIPPING CARRIERS
// ============================================
const SHIPPING_CARRIERS = {
  FEDEX: 'fedex',
  UPS: 'ups',
  DHL: 'dhl',
  USPS: 'usps',
  LOCAL_DELIVERY: 'local_delivery',
  OTHER: 'other'
};

// ============================================
// NOTIFICATION TYPES
// ============================================
const NOTIFICATION_TYPES = {
  // Transaction notifications
  PAYMENT_MADE: 'payment_made',
  PAYMENT_RECEIVED: 'payment_received',
  ESCROW_ACTIVATED: 'escrow_activated',
  ESCROW_RELEASED: 'escrow_released',
  WITHDRAWAL_PROCESSED: 'withdrawal_processed',
  REFUND_ISSUED: 'refund_issued',

  // Security notifications
  LOGIN_NEW_DEVICE: 'login_new_device',
  PASSWORD_CHANGED: 'password_changed',
  EMAIL_CHANGED: 'email_changed',
  TWO_FACTOR_ENABLED: 'two_factor_enabled',
  ACCOUNT_LOCKED: 'account_locked',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',

  // Order notifications
  ORDER_PLACED: 'order_placed',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',

  // Review notifications
  REVIEW_RECEIVED: 'review_received',
  REVIEW_REMINDER: 'review_reminder',
  SELLER_RESPONSE: 'seller_response',

  // Dispute notifications
  DISPUTE_CREATED: 'dispute_created',
  DISPUTE_RECEIVED: 'dispute_received',
  DISPUTE_RESOLVED: 'dispute_resolved'
};

const NOTIFICATION_CATEGORIES = {
  TRANSACTION: 'transaction',
  SECURITY: 'security',
  ORDER: 'order',
  REVIEW: 'review',
  DISPUTE: 'dispute',
  SYSTEM: 'system'
};

const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// ============================================
// INVENTORY TYPES
// ============================================
const INVENTORY_TYPES = {
  STOCK_IN: 'stock_in',
  STOCK_OUT: 'stock_out',
  ADJUSTMENT: 'adjustment',
  SALE: 'sale',
  RETURN: 'return',
  DAMAGE: 'damage'
};

// ============================================
// DOCUMENT TYPES
// ============================================
const DOCUMENT_TYPES = {
  IDENTITY: {
    PASSPORT: 'passport',
    NATIONAL_ID: 'national_id',
    DRIVERS_LICENSE: 'drivers_license'
  },
  PROOF_OF_ADDRESS: {
    UTILITY_BILL: 'utility_bill',
    BANK_STATEMENT: 'bank_statement',
    RENTAL_AGREEMENT: 'rental_agreement',
    GOVERNMENT_LETTER: 'government_letter'
  }
};

// ============================================
// UNITS AND MEASUREMENTS
// ============================================
const WEIGHT_UNITS = {
  LBS: 'lbs',
  KG: 'kg',
  G: 'g',
  OZ: 'oz'
};

const DIMENSION_UNITS = {
  INCHES: 'in',
  CENTIMETERS: 'cm'
};

const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  BTC: 'BTC',
  ETH: 'ETH'
};

// ============================================
// VALIDATION PATTERNS
// ============================================
const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-()]+$/,
  POSTAL_CODE: /^[A-Za-z0-9\s\-]{3,10}$/,
  SKU: /^[A-Za-z0-9\-_]{3,50}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  WALLET_ADDRESS: /^0x[a-fA-F0-9]{40}$/
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const getCategoryOptions = () => {
  return Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label
  }));
};

const getStatusLabel = (status, type) => {
  const statusMaps = {
    product: PRODUCT_STATUS,
    order: ORDER_STATUS,
    payment: PAYMENT_STATUS,
    dispute: DISPUTE_STATUS,
    kyc: KYC_STATUS,
    notification: NOTIFICATION_STATUS
  };
  
  return statusMaps[type]?.[status.toUpperCase()] || status;
};

const isValidStatus = (status, type) => {
  const statusMaps = {
    product: Object.values(PRODUCT_STATUS),
    order: Object.values(ORDER_STATUS),
    payment: Object.values(PAYMENT_STATUS),
    dispute: Object.values(DISPUTE_STATUS),
    kyc: Object.values(KYC_STATUS),
    notification: Object.values(NOTIFICATION_STATUS)
  };
  
  return statusMaps[type]?.includes(status) || false;
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  // Categories
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_ENUM,
  
  // Status enums
  PRODUCT_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  DISPUTE_STATUS,
  KYC_STATUS,
  NOTIFICATION_STATUS,
  
  // User types
  USER_TYPES,
  USER_ROLES,
  
  // Payment and shipping
  PAYMENT_METHODS,
  SHIPPING_CARRIERS,
  
  // Notifications
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  
  // Inventory
  INVENTORY_TYPES,
  
  // Documents
  DOCUMENT_TYPES,
  
  // Units
  WEIGHT_UNITS,
  DIMENSION_UNITS,
  CURRENCIES,
  
  // Validation
  VALIDATION_PATTERNS,
  
  // Helper functions
  getCategoryOptions,
  getStatusLabel,
  isValidStatus
}; 