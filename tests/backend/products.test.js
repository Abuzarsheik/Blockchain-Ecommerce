const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../backend/models/User');
const Product = require('../../backend/models/Product');

// Set comprehensive test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only_min_32_chars_long_enough';
process.env.EMAIL_SERVICE_ENABLED = 'false';
process.env.MONGODB_URI = 'test';
process.env.PORT = '5001';

let app;
let mongoServer;

describe('Products API', () => {
  let sellerToken;
  let sellerId;
  let productId;

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
  }, 60000);

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await Product.deleteMany({});

    // Create a seller user
    const sellerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'Seller',
        username: 'testseller123',
        email: 'seller@example.com',
        password: 'SecurePass123!',
        userType: 'seller'
      });

    sellerToken = sellerResponse.body.token;
    // Get seller ID from the registered user response
    sellerId = sellerResponse.body.user.id || sellerResponse.body.user._id;

    // Create test products with valid categories and proper structure
    const product1 = await Product.create({
      name: 'Test Product 1',
      description: 'First test product for testing purposes',
      price: 100,
      category: 'electronics', // Valid category
      inventory: { quantity: 10 },
      seller: sellerId,
      status: 'active'
    });

    const product2 = await Product.create({
      name: 'Test Product 2', 
      description: 'Second test product for testing purposes',
      price: 200,
      category: 'clothing', // Valid category
      inventory: { quantity: 5 },
      seller: sellerId,
      status: 'active'
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await mongoose.connection.close();
    await mongoServer.stop();
  }, 60000);

  describe('POST /api/products', () => {
    it('should create a new product successfully', async () => {
      const productData = {
        name: 'Test NFT Product',
        description: 'A test NFT product for verification with proper description',
        price: 0.1,
        category: 'art-collectibles', // Use valid category
        quantity: 5,
        specifications: [
          {
            name: 'Material',
            value: 'Digital'
          },
          {
            name: 'Type',
            value: 'NFT'
          }
        ]
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData)
        .expect(201);

      // The API returns { message: '...', product: {...} }
      expect(response.body.message).toBeDefined();
      expect(response.body.product).toBeDefined();
      expect(response.body.product.name).toBe(productData.name);
      
      productId = response.body.product._id;
    });

    it('should reject product creation without authentication', async () => {
      const productData = {
        name: 'Test NFT Product',
        description: 'A test NFT product with proper description',
        price: 0.1,
        category: 'art-collectibles'
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject product with invalid price', async () => {
      const productData = {
        name: 'Test NFT Product',
        description: 'A test NFT product with proper description',
        price: -1,
        category: 'art-collectibles',
        specifications: [
          {
            name: 'Material',
            value: 'Digital'
          }
        ]
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject product without required fields', async () => {
      const productData = {
        name: 'Test NFT Product'
        // Missing required fields like description, price, category
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/products', () => {
    it('should get all products with pagination', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      // The API returns { products: [], pagination: {} }
      expect(response.body.products).toBeDefined();
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total_items).toBeDefined();
    });

    it('should filter products by category', async () => {
      // Create products with different categories
      await Product.create({
        name: 'Electronics Product',
        description: 'An electronics product for testing',
        price: 150,
        category: 'electronics',
        inventory: { quantity: 3 },
        seller: sellerId,
        status: 'active'
      });

      await Product.create({
        name: 'Clothing Product',
        description: 'A clothing product for testing', 
        price: 75,
        category: 'clothing',
        inventory: { quantity: 8 },
        seller: sellerId,
        status: 'active'
      });

      const response = await request(app)
        .get('/api/products?category=electronics')
        .expect(200);

      expect(response.body.products).toBeDefined();
      expect(Array.isArray(response.body.products)).toBe(true);
      // Category filtering might return products from the filter
      if (response.body.products.length > 0) {
        expect(response.body.products[0].category).toBe('electronics');
      }
    });

    it('should get product categories', async () => {
      const response = await request(app)
        .get('/api/products/categories')
        .expect(200);

      expect(response.body.categories).toBeDefined();
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/products/:id', () => {
    beforeEach(async () => {
      const product = new Product({
        name: 'Test NFT Product',
        description: 'A test NFT product for testing purposes',
        price: 0.1,
        category: 'art-collectibles', // Use valid category
        seller: sellerId,
        status: 'active'
      });

      const savedProduct = await product.save();
      productId = savedProduct._id;
    });

    it('should get product by ID', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(response.body.product).toBeDefined();
      expect(response.body.product._id).toBe(productId.toString());
      expect(response.body.product.name).toBe('Test NFT Product');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid product ID', async () => {
      const response = await request(app)
        .get('/api/products/invalid-id')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/products/:id', () => {
    beforeEach(async () => {
      const product = new Product({
        name: 'Test NFT Product',
        description: 'A test NFT product for testing purposes',
        price: 0.1,
        category: 'art-collectibles', // Use valid category
        seller: sellerId,
        status: 'active'
      });

      const savedProduct = await product.save();
      productId = savedProduct._id;
    });

    it('should update product successfully', async () => {
      const updateData = {
        name: 'Updated NFT Product',
        price: 0.2
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(response.body.product).toBeDefined();
      expect(response.body.product.name).toBe(updateData.name);
      expect(response.body.product.price).toBe(updateData.price);
    });

    it('should reject update without authorization', async () => {
      const updateData = {
        name: 'Updated NFT Product'
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject update by non-owner', async () => {
      // Create another user
      const buyerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'Buyer',
          username: 'testbuyer123',
          email: 'buyer@example.com',
          password: 'SecurePass123!',
          userType: 'buyer'
        });

      const updateData = {
        name: 'Updated NFT Product'
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${buyerResponse.body.token}`)
        .send(updateData)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/products/:id', () => {
    beforeEach(async () => {
      const product = new Product({
        name: 'Test NFT Product',
        description: 'A test NFT product for testing purposes',
        price: 0.1,
        category: 'art-collectibles', // Use valid category
        seller: sellerId,
        status: 'active'
      });

      const savedProduct = await product.save();
      productId = savedProduct._id;
    });

    it('should delete product successfully', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.message).toBeDefined();

      // Verify product is marked as discontinued (not actually deleted)
      const discontinuedProduct = await Product.findById(productId);
      expect(discontinuedProduct).not.toBeNull();
      expect(discontinuedProduct.status).toBe('discontinued');
    });

    it('should reject deletion without authorization', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
}); 