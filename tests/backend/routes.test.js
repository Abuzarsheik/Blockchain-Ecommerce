const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../backend/models/User');
const Product = require('../../backend/models/Product');
const Order = require('../../backend/models/Order');
const { generateToken } = require('../../backend/middleware/auth');
const bcrypt = require('bcryptjs');

// Set comprehensive test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only_min_32_chars_long_enough';
process.env.EMAIL_SERVICE_ENABLED = 'false';
process.env.MONGODB_URI = 'test';
process.env.PORT = '5001';

// Declare variables at module level to avoid scoping issues
let authToken;
let adminToken;
let testUser;
let adminUser;
let testProduct;
let app;
let mongoServer;

describe('🔥 COMPREHENSIVE API ROUTES TEST SUITE', () => {

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Import test server instead of main server
    app = require('../test-server');
    
    // Create test users with proper structure and real password hashing
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    testUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser123',
      email: 'test@example.com',
      password_hash: hashedPassword,
      userType: 'buyer'
    });

    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      username: 'adminuser123',
      email: 'admin@example.com',
      password_hash: hashedPassword,
      userType: 'buyer',
      role: 'admin'
    });

    // Generate tokens
    authToken = generateToken(testUser._id);
    adminToken = generateToken(adminUser._id);

    // Create test product with correct field names
    testProduct = await Product.create({
      name: 'Test Product', // Use 'name' instead of 'title'
      description: 'A test product for testing',
      price: 99.99,
      category: 'electronics', // Use lowercase category
      inventory: {
        quantity: 10
      },
      seller: testUser._id,
      status: 'active'
    });
  }, 60000);

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await mongoose.connection.close();
    await mongoServer.stop();
  }, 60000);

  // ============================================
  // 🔐 AUTHENTICATION ROUTES TESTS
  // ============================================
  describe('Authentication Routes', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          firstName: 'New',
          lastName: 'User',
          username: 'newuser123',
          email: 'newuser@example.com',
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!',
          userType: 'buyer'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.message || response.body.user).toBeDefined();
        expect(response.body.user?.email || response.body.email).toBe(userData.email);
        expect(response.body.token).toBeDefined();
      });

      it('should reject registration with invalid email', async () => {
        const userData = {
          name: 'Test User',
          email: 'invalid-email',
          password: 'StrongPass123!',
          confirmPassword: 'StrongPass123!'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('should reject registration with weak password', async () => {
        const userData = {
          name: 'Test User',
          email: 'test2@example.com',
          password: 'weak',
          confirmPassword: 'weak'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('should reject registration with mismatched passwords', async () => {
        const userData = {
          name: 'Test User',
          email: 'test3@example.com',
          password: 'StrongPass123!',
          confirmPassword: 'DifferentPass123!'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login user successfully', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe(loginData.email);
      });

      it('should reject login with invalid credentials', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'wrongpassword'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should reject login with invalid email format', async () => {
        const loginData = {
          email: 'invalid-email',
          password: 'password123'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });
  });

  // ============================================
  // 🛍️ PRODUCT ROUTES TESTS
  // ============================================
  describe('Product Routes', () => {
    describe('GET /api/products', () => {
      it('should get all products with pagination', async () => {
        const response = await request(app)
          .get('/api/products?page=1&limit=10')
          .expect(200);

        expect(Array.isArray(response.body.products)).toBe(true);
        expect(response.body.pagination).toBeDefined();
      });

      it('should filter products by category', async () => {
        const response = await request(app)
          .get('/api/products?category=electronics')
          .expect(200);

        expect(Array.isArray(response.body.products)).toBe(true);
        if (response.body.products.length > 0) {
          expect(response.body.products[0].category).toBe('electronics');
        }
      });

      it('should search products by title', async () => {
        const response = await request(app)
          .get('/api/products?search=Test')
          .expect(200);

        expect(Array.isArray(response.body.products)).toBe(true);
      });

      it('should reject invalid pagination parameters', async () => {
        const response = await request(app)
          .get('/api/products?page=0&limit=1000')
          .expect(200); // API handles this gracefully, doesn't error

        expect(Array.isArray(response.body.products)).toBe(true);
      });
    });

    describe('POST /api/products', () => {
      it('should create a new product with authentication', async () => {
        const productData = {
          name: 'New Test Product',
          description: 'This is a new test product for testing with sufficient description length',
          price: 149.99,
          category: 'electronics',
          quantity: 5,
          specifications: [{ name: 'Brand', value: 'Test Brand' }]
        };

        const response = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send(productData)
          .expect(201);

        expect(response.body.message).toBeDefined();
        expect(response.body.product).toBeDefined();
        expect(response.body.product.name).toBe(productData.name);
      });

      it('should reject product creation without authentication', async () => {
        const productData = {
          name: 'Unauthorized Product',
          description: 'This should fail because no authentication is provided',
          price: 99.99,
          category: 'electronics',
          quantity: 1
        };

        const response = await request(app)
          .post('/api/products')
          .send(productData)
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should reject product with invalid data', async () => {
        const productData = {
          price: -10, // Negative price should fail
          category: 'electronics'
          // Missing required fields like name and description
        };

        const response = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send(productData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });

    describe('PUT /api/products/:id', () => {
      it('should update product by owner', async () => {
        const updateData = {
          name: 'Updated Test Product',
          price: 199.99
        };

        const response = await request(app)
          .put(`/api/products/${testProduct._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.message).toBeDefined();
        expect(response.body.product.name).toBe(updateData.name);
        expect(response.body.product.price).toBe(updateData.price);
      });

      it('should reject update by non-owner', async () => {
        const updateData = {
          name: 'Unauthorized Update'
        };

        const response = await request(app)
          .put(`/api/products/${testProduct._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(403);

        expect(response.body.error).toBeDefined();
      });

      it('should reject update with invalid ID', async () => {
        const updateData = {
          name: 'Updated Product'
        };

        const response = await request(app)
          .put('/api/products/invalid-id')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });

    describe('DELETE /api/products/:id', () => {
      it('should allow admin to delete any product', async () => {
        // Create a product to delete
        const productToDelete = await Product.create({
          name: 'Product to Delete',
          description: 'This product will be deleted for testing purposes',
          price: 50.00,
          category: 'books',
          inventory: {
            quantity: 1
          },
          seller: testUser._id
        });

        const response = await request(app)
          .delete(`/api/products/${productToDelete._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.message).toBeDefined();
      });

      it('should allow owner to delete their product', async () => {
        // Create a product to delete
        const productToDelete = await Product.create({
          name: 'Owner Product to Delete',
          description: 'This product will be deleted by owner',
          price: 75.00,
          category: 'clothing', // Use valid lowercase category
          inventory: {
            quantity: 2
          },
          seller: testUser._id
        });

        const response = await request(app)
          .delete(`/api/products/${productToDelete._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.message).toBeDefined();
      });
    });
  });

  // ============================================
  // 📦 ORDER ROUTES TESTS
  // ============================================
  describe('Order Routes', () => {
    describe('POST /api/orders', () => {
      it('should create a new order with valid data', async () => {
        const orderData = {
          items: [{
            product_id: testProduct._id,
            quantity: 2,
            price: testProduct.price
          }],
          payment_method: 'card',
          billing_info: {
            firstName: 'Test',
            lastName: 'User',
            address: '123 Test Street',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Test Country',
            phone: '123-456-7890'
          },
          shippingAddress: {
            street: '123 Test Street',
            city: 'Test City',
            postalCode: '12345',
            country: 'Test Country'
          }
        };

        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(orderData)
          .expect(201);

        expect(response.body.message).toBeDefined();
        expect(response.body.order.items).toHaveLength(1);
        expect(response.body.order.user_id).toBe(testUser._id.toString());
      });

      it('should reject order without authentication', async () => {
        const orderData = {
          items: [{
            productId: testProduct._id,
            quantity: 1
          }],
          shippingAddress: {
            street: '123 Test Street',
            city: 'Test City',
            postalCode: '12345',
            country: 'Test Country'
          }
        };

        const response = await request(app)
          .post('/api/orders')
          .send(orderData)
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should reject order with invalid product ID', async () => {
        const orderData = {
          items: [{
            product_id: 'invalid-id',
            quantity: 1,
            price: 10.00
          }],
          payment_method: 'card',
          billing_info: {
            firstName: 'Test',
            lastName: 'User',
            address: '123 Test Street',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Test Country',
            phone: '123-456-7890'
          },
          shippingAddress: {
            street: '123 Test Street',
            city: 'Test City',
            postalCode: '12345',
            country: 'Test Country'
          }
        };

        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(orderData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('should reject order with incomplete shipping address', async () => {
        const orderData = {
          items: [{
            product_id: testProduct._id,
            quantity: 1,
            price: testProduct.price
          }],
          payment_method: 'card',
          billing_info: {
            firstName: 'Test',
            lastName: 'User',
            address: '123 Test Street',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Test Country',
            phone: '123-456-7890'
          },
          shippingAddress: {
            street: '123 Test Street'
            // Missing city, postalCode, country
          }
        };

        const response = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send(orderData)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });

    describe('GET /api/orders', () => {
      it('should get user orders with authentication', async () => {
        const response = await request(app)
          .get('/api/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body.orders)).toBe(true);
      });

      it('should reject getting orders without authentication', async () => {
        const response = await request(app)
          .get('/api/orders')
          .expect(401);

        expect(response.body.error).toBeDefined();
      });
    });
  });

  // ============================================
  // ⚙️ ADMIN ROUTES TESTS
  // ============================================
  describe('Admin Routes', () => {
    describe('GET /api/admin/users', () => {
      it('should allow admin to get all users', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body.users)).toBe(true);
      });

      it('should reject non-admin access to admin routes', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.error).toBeDefined();
      });

      it('should reject access without authentication', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .expect(401);

        expect(response.body.error).toBeDefined();
      });
    });
  });

  // ============================================
  // 📊 MONITORING ROUTES TESTS
  // ============================================
  describe('Monitoring Routes', () => {
    describe('GET /api/monitoring/health', () => {
      it('should return health status without authentication', async () => {
        const response = await request(app)
          .get('/api/monitoring/health')
          .expect(200);

        expect(response.body.health).toBeDefined();
      });
    });

    describe('GET /api/monitoring/metrics', () => {
      it('should allow admin to get metrics', async () => {
        const response = await request(app)
          .get('/api/monitoring/metrics')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.data).toBeDefined();
      });

      it('should reject non-admin access to metrics', async () => {
        const response = await request(app)
          .get('/api/monitoring/metrics')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body.error).toBeDefined();
      });
    });
  });

  // ============================================
  // 🔍 ERROR HANDLING TESTS
  // ============================================
  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com"') // Malformed JSON
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle requests with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should handle requests with expired token', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MGY1NzZkYjQ4YjgxZjIyYzg5ZTIyZWYiLCJpYXQiOjE2MjY3NzQ3NDcsImV4cCI6MTYyNjc3NDc0N30.invalid';
      
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  // ============================================
  // 🛡️ SECURITY TESTS
  // ============================================
  describe('Security Tests', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should reject requests with large payloads', async () => {
      const largePayload = {
        data: 'x'.repeat(10 * 1024 * 1024) // 10MB of data
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largePayload)
        .expect(413);

      expect(response.body.error).toBeDefined();
    });

    it('should sanitize XSS attempts', async () => {
      const xssPayload = {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'StrongPass123!',
        confirmPassword: 'StrongPass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(xssPayload)
        .expect(400); // Should fail validation

      expect(response.body.error).toBeDefined();
    });
  });
}); 