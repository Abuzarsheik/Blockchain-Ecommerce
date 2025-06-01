const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../backend/models/User');
const jwt = require('jsonwebtoken');

// Set comprehensive test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only_min_32_chars_long_enough';
process.env.EMAIL_SERVICE_ENABLED = 'false';
process.env.MONGODB_URI = 'test';
process.env.PORT = '5001';

let app;
let mongoServer;

describe('Authentication API', () => {
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
    // Clear database before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
    await mongoServer.stop();
  }, 60000);

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser123',
        email: 'test@example.com',
        password: 'SecurePass123!',
        userType: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toContain('User registered successfully');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.firstName).toBe(userData.firstName);
      expect(response.body.token).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser123',
        email: 'invalid-email',
        password: 'SecurePass123!',
        userType: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.details).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser123',
        email: 'test@example.com',
        password: '123',
        userType: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser123',
        email: 'test@example.com',
        password: 'SecurePass123!',
        userType: 'buyer'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send({...userData, username: 'testuser456'}) // Different username
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user through registration API
      await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser123',
          email: 'test@example.com',
          password: 'SecurePass123!',
          userType: 'buyer'
        });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    let userToken;

    beforeEach(async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser123',
        email: 'test@example.com',
        password: 'SecurePass123!',
        userType: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      userToken = response.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
}); 