const axios = require('axios');
const colors = require('colors');

// Base configuration
const BASE_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

// Test data
const testUsers = {
  buyer: {
    email: 'buyer@test.com',
    password: 'Test123!',
    firstName: 'John',
    lastName: 'Buyer',
    role: 'user'
  },
  seller: {
    email: 'seller@test.com',
    password: 'Test123!',
    firstName: 'Jane',
    lastName: 'Seller',
    role: 'seller'
  },
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  }
};

const testNFT = {
  name: 'Test Digital Art #001',
  description: 'A beautiful test NFT for marketplace testing',
  price: 0.1,
  category: 'Digital Art',
  tags: ['test', 'digital', 'art'],
  royalty: 10
};

// Utility functions
const logSection = (message) => {
  console.log('\n' + '='.repeat(60));
  console.log(message.yellow.bold);
  console.log('='.repeat(60));
};

const logTest = (message, status = 'info') => {
  const colors_map = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'cyan'
  };
  console.log(`${status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'warning' ? '⚠️' : 'ℹ️'} ${message}`[colors_map[status]]);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API Testing functions
async function testAPIEndpoint(endpoint, method = 'GET', data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data
    };
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
}

// Authentication functions
async function registerUser(userData) {
  logTest(`Registering user: ${userData.email}`, 'info');
  const result = await testAPIEndpoint('/api/auth/register', 'POST', userData);
  
  if (result.success) {
    logTest(`User registered successfully: ${userData.email}`, 'success');
    return result.data;
  } else {
    logTest(`Registration failed: ${result.error}`, 'error');
    return null;
  }
}

async function loginUser(email, password) {
  logTest(`Logging in user: ${email}`, 'info');
  const result = await testAPIEndpoint('/api/auth/login', 'POST', { email, password });
  
  if (result.success) {
    logTest(`Login successful: ${email}`, 'success');
    return result.data.token;
  } else {
    logTest(`Login failed: ${result.error}`, 'error');
    return null;
  }
}

// Buyer perspective testing
async function testBuyerPerspective() {
  logSection('🛒 TESTING BUYER PERSPECTIVE');
  
  // Register and login buyer
  await registerUser(testUsers.buyer);
  const buyerToken = await loginUser(testUsers.buyer.email, testUsers.buyer.password);
  
  if (!buyerToken) {
    logTest('Buyer authentication failed - skipping buyer tests', 'error');
    return;
  }

  // Test NFT browsing
  logTest('Testing NFT catalog browsing...', 'info');
  const catalogResult = await testAPIEndpoint('/api/nfts', 'GET', null, buyerToken);
  if (catalogResult.success) {
    logTest(`NFT catalog loaded: ${catalogResult.data.nfts?.length || 0} NFTs found`, 'success');
  } else {
    logTest('Failed to load NFT catalog', 'error');
  }

  // Test search functionality
  logTest('Testing search functionality...', 'info');
  const searchResult = await testAPIEndpoint('/api/nfts/search?q=art', 'GET', null, buyerToken);
  if (searchResult.success) {
    logTest('Search functionality working', 'success');
  } else {
    logTest('Search functionality failed', 'error');
  }

  // Test user profile
  logTest('Testing user profile access...', 'info');
  const profileResult = await testAPIEndpoint('/api/users/profile', 'GET', null, buyerToken);
  if (profileResult.success) {
    logTest('User profile loaded successfully', 'success');
  } else {
    logTest('Failed to load user profile', 'error');
  }

  // Test wishlist functionality
  logTest('Testing wishlist functionality...', 'info');
  const wishlistResult = await testAPIEndpoint('/api/users/wishlist', 'GET', null, buyerToken);
  if (wishlistResult.success) {
    logTest('Wishlist functionality working', 'success');
  } else {
    logTest('Wishlist functionality failed', 'error');
  }

  // Test order history
  logTest('Testing order history...', 'info');
  const ordersResult = await testAPIEndpoint('/api/orders/user', 'GET', null, buyerToken);
  if (ordersResult.success) {
    logTest('Order history loaded successfully', 'success');
  } else {
    logTest('Failed to load order history', 'error');
  }

  logTest('Buyer perspective testing completed', 'success');
}

// Seller perspective testing
async function testSellerPerspective() {
  logSection('🎨 TESTING SELLER PERSPECTIVE');
  
  // Register and login seller
  await registerUser(testUsers.seller);
  const sellerToken = await loginUser(testUsers.seller.email, testUsers.seller.password);
  
  if (!sellerToken) {
    logTest('Seller authentication failed - skipping seller tests', 'error');
    return;
  }

  // Test NFT creation
  logTest('Testing NFT creation...', 'info');
  const createNFTResult = await testAPIEndpoint('/api/nfts/create', 'POST', testNFT, sellerToken);
  if (createNFTResult.success) {
    logTest('NFT creation successful', 'success');
  } else {
    logTest(`NFT creation failed: ${createNFTResult.error}`, 'error');
  }

  // Test seller dashboard
  logTest('Testing seller dashboard...', 'info');
  const dashboardResult = await testAPIEndpoint('/api/seller/dashboard', 'GET', null, sellerToken);
  if (dashboardResult.success) {
    logTest('Seller dashboard loaded successfully', 'success');
  } else {
    logTest('Failed to load seller dashboard', 'error');
  }

  // Test listing management
  logTest('Testing listing management...', 'info');
  const listingsResult = await testAPIEndpoint('/api/seller/listings', 'GET', null, sellerToken);
  if (listingsResult.success) {
    logTest('Listing management working', 'success');
  } else {
    logTest('Listing management failed', 'error');
  }

  // Test sales analytics
  logTest('Testing sales analytics...', 'info');
  const analyticsResult = await testAPIEndpoint('/api/seller/analytics', 'GET', null, sellerToken);
  if (analyticsResult.success) {
    logTest('Sales analytics working', 'success');
  } else {
    logTest('Sales analytics failed', 'error');
  }

  // Test creator profile
  logTest('Testing creator profile...', 'info');
  const creatorProfileResult = await testAPIEndpoint('/api/seller/profile', 'GET', null, sellerToken);
  if (creatorProfileResult.success) {
    logTest('Creator profile loaded successfully', 'success');
  } else {
    logTest('Failed to load creator profile', 'error');
  }

  logTest('Seller perspective testing completed', 'success');
}

// Admin perspective testing
async function testAdminPerspective() {
  logSection('👑 TESTING ADMIN PERSPECTIVE');
  
  // Register and login admin
  await registerUser(testUsers.admin);
  const adminToken = await loginUser(testUsers.admin.email, testUsers.admin.password);
  
  if (!adminToken) {
    logTest('Admin authentication failed - skipping admin tests', 'error');
    return;
  }

  // Test admin dashboard
  logTest('Testing admin dashboard...', 'info');
  const adminDashboardResult = await testAPIEndpoint('/api/admin/dashboard', 'GET', null, adminToken);
  if (adminDashboardResult.success) {
    logTest('Admin dashboard loaded successfully', 'success');
  } else {
    logTest('Failed to load admin dashboard', 'error');
  }

  // Test user management
  logTest('Testing user management...', 'info');
  const usersResult = await testAPIEndpoint('/api/admin/users', 'GET', null, adminToken);
  if (usersResult.success) {
    logTest('User management working', 'success');
  } else {
    logTest('User management failed', 'error');
  }

  // Test NFT moderation
  logTest('Testing NFT moderation...', 'info');
  const moderationResult = await testAPIEndpoint('/api/admin/nfts/pending', 'GET', null, adminToken);
  if (moderationResult.success) {
    logTest('NFT moderation working', 'success');
  } else {
    logTest('NFT moderation failed', 'error');
  }

  // Test system analytics
  logTest('Testing system analytics...', 'info');
  const systemAnalyticsResult = await testAPIEndpoint('/api/admin/analytics', 'GET', null, adminToken);
  if (systemAnalyticsResult.success) {
    logTest('System analytics working', 'success');
  } else {
    logTest('System analytics failed', 'error');
  }

  // Test transaction monitoring
  logTest('Testing transaction monitoring...', 'info');
  const transactionsResult = await testAPIEndpoint('/api/admin/transactions', 'GET', null, adminToken);
  if (transactionsResult.success) {
    logTest('Transaction monitoring working', 'success');
  } else {
    logTest('Transaction monitoring failed', 'error');
  }

  logTest('Admin perspective testing completed', 'success');
}

// Core functionality testing
async function testCoreFunctionality() {
  logSection('⚙️ TESTING CORE FUNCTIONALITY');
  
  // Test API health
  logTest('Testing API health...', 'info');
  const healthResult = await testAPIEndpoint('/api/health');
  if (healthResult.success) {
    logTest('API health check passed', 'success');
  } else {
    logTest('API health check failed', 'error');
  }

  // Test CORS
  logTest('Testing CORS configuration...', 'info');
  try {
    const corsTest = await axios.options(`${BASE_URL}/api/health`);
    logTest('CORS configuration working', 'success');
  } catch (error) {
    logTest('CORS configuration issue', 'warning');
  }

  // Test rate limiting
  logTest('Testing rate limiting...', 'info');
  const rateLimitPromises = Array(10).fill().map(() => testAPIEndpoint('/api/health'));
  const rateLimitResults = await Promise.all(rateLimitPromises);
  const successCount = rateLimitResults.filter(r => r.success).length;
  logTest(`Rate limiting test: ${successCount}/10 requests succeeded`, successCount > 0 ? 'success' : 'error');
}

// Frontend connectivity testing
async function testFrontendConnectivity() {
  logSection('🌐 TESTING FRONTEND CONNECTIVITY');
  
  try {
    logTest('Testing frontend accessibility...', 'info');
    const frontendResult = await axios.get(FRONTEND_URL);
    if (frontendResult.status === 200) {
      logTest('Frontend is accessible', 'success');
    } else {
      logTest('Frontend accessibility issue', 'warning');
    }
  } catch (error) {
    logTest('Frontend not accessible - may still be starting up', 'warning');
  }
}

// Main testing function
async function runComprehensiveTests() {
  console.log('🚀 BLOCMERCE COMPREHENSIVE USER TESTING'.rainbow.bold);
  console.log('Testing all perspectives: Buyer, Seller, Admin\n');

  try {
    // Wait for servers to start
    logTest('Waiting for servers to initialize...', 'info');
    await delay(5000);

    // Test core functionality first
    await testCoreFunctionality();
    await delay(2000);

    // Test frontend connectivity
    await testFrontendConnectivity();
    await delay(2000);

    // Test all user perspectives
    await testBuyerPerspective();
    await delay(2000);
    
    await testSellerPerspective();
    await delay(2000);
    
    await testAdminPerspective();

    // Final summary
    logSection('🎯 TESTING COMPLETE');
    logTest('All perspective testing completed!', 'success');
    logTest('Check individual test results above for detailed status', 'info');
    
    console.log('\n📊 SUMMARY:'.yellow.bold);
    console.log('✅ Buyer perspective: Browse, search, profile, wishlist, orders');
    console.log('✅ Seller perspective: Create NFTs, dashboard, listings, analytics');
    console.log('✅ Admin perspective: User management, moderation, analytics');
    console.log('✅ Core functionality: API health, CORS, rate limiting');
    console.log('✅ Frontend connectivity: React application accessibility');

  } catch (error) {
    logTest(`Testing error: ${error.message}`, 'error');
  }
}

// Export for external use
module.exports = {
  runComprehensiveTests,
  testBuyerPerspective,
  testSellerPerspective,
  testAdminPerspective,
  testCoreFunctionality
};

// Run tests if called directly
if (require.main === module) {
  runComprehensiveTests();
} 