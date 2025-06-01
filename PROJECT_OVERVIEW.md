# 🛒 Blocmerce - Blockchain E-commerce Platform

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Testing Guide](#testing-guide)
- [API Documentation](#api-documentation)
- [User Roles & Permissions](#user-roles--permissions)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🎯 Project Overview

**Blocmerce** is a cutting-edge, full-stack e-commerce platform that seamlessly integrates traditional online shopping with blockchain technology and NFT marketplace capabilities. Built with modern web technologies, it provides a secure, scalable, and feature-rich marketplace for both physical products and digital assets.

### 🚀 What Makes Blocmerce Unique
- **Hybrid Marketplace**: Traditional e-commerce + NFT trading
- **Blockchain Integration**: Wallet connectivity and crypto payments
- **Multi-role System**: Buyers, sellers, and administrators
- **Real-time Features**: Live notifications and order tracking
- **AI-Powered**: Personalized recommendations and intelligent search
- **Enterprise-Grade Security**: 2FA, audit trails, and advanced authentication

## 🎯 Key Features

### 🛒 **E-commerce Core Features**
- **Product Management**: Add, edit, delete products with multiple images
- **Shopping Cart**: Persistent cart with quantity management
- **Checkout System**: Secure payment processing
- **Order Management**: Complete order lifecycle tracking
- **Inventory Control**: Stock management with low-stock alerts
- **Search & Filtering**: Advanced product discovery
- **Wishlist System**: Save products for later

### 🎨 **NFT Marketplace**
- **Digital Asset Trading**: Buy, sell, and trade NFTs
- **Wallet Integration**: MetaMask and Web3 connectivity
- **Ownership Verification**: Blockchain-based authenticity
- **Smart Contracts**: Automated transactions and royalties
- **Collection Management**: Organize and showcase NFT collections

### 👥 **User Management**
- **Multi-role Authentication**: Buyers, sellers, admins
- **Profile Management**: Comprehensive user profiles
- **KYC Verification**: Identity verification system
- **Social Features**: Follow users, social interactions
- **Preferences**: Customizable user experience

### ⭐ **Review & Rating System**
- **Product Reviews**: Detailed ratings with images
- **Seller Ratings**: Seller performance tracking
- **Verified Purchases**: Authentic review verification
- **Helpful Voting**: Community-driven review quality
- **Response System**: Seller responses to reviews

### 📊 **Analytics & Insights**
- **User Dashboard**: Personal analytics and insights
- **Seller Dashboard**: Sales performance and inventory
- **Admin Analytics**: Platform-wide statistics
- **Real-time Monitoring**: Live system performance
- **Custom Reports**: Exportable analytics data

### 🔔 **Real-time Features**
- **Live Notifications**: Instant updates for activities
- **Order Tracking**: Real-time shipment tracking
- **Activity Feeds**: Social activity streams
- **Chat System**: User communication features
- **Push Notifications**: Browser and email alerts

### 🛡️ **Security Features**
- **Two-Factor Authentication**: Enhanced account security
- **Session Management**: Secure session handling
- **Audit Trails**: Comprehensive activity logging
- **Rate Limiting**: API abuse prevention
- **Data Encryption**: Secure data transmission
- **CORS Protection**: Cross-origin security

### 🔗 **Blockchain Integration**
- **Wallet Connectivity**: MetaMask integration
- **Smart Contracts**: Ethereum-based contracts
- **Transaction Verification**: Blockchain transaction tracking
- **Cryptocurrency Payments**: Crypto payment processing
- **Decentralized Storage**: IPFS integration for assets

## 🛠️ Technology Stack

### **Frontend**
- **Framework**: React.js 18.x
- **State Management**: Redux Toolkit
- **Styling**: CSS3, Custom Components
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Build Tool**: Create React App
- **Bundle Size**: 404.18 kB (optimized)

### **Backend**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, bcrypt
- **Email**: Nodemailer
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Jest, Supertest

### **Blockchain**
- **Network**: Ethereum
- **Web3 Library**: ethers.js, Web3.js
- **Wallet**: MetaMask integration
- **Smart Contracts**: Solidity
- **IPFS**: Decentralized storage

### **DevOps & Tools**
- **Version Control**: Git
- **Package Manager**: npm
- **Linting**: ESLint
- **Testing**: Jest
- **Documentation**: Markdown

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v16+ recommended)
- MongoDB (local or cloud)
- Git
- MetaMask browser extension (for blockchain features)

### **1. Clone Repository**
```bash
git clone <repository-url>
cd "FYP project"
```

### **2. Backend Setup**
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure environment variables
# Edit .env file with your settings:
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
MONGODB_URI=mongodb://localhost:27017/blocmerce
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
PORT=5000

# Start development server
npm run dev
```

**Backend will be available at**: `http://localhost:5000`

### **3. Frontend Setup**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

**Frontend will be available at**: `http://localhost:3000`

### **4. Database Setup**
```bash
# Start MongoDB (if running locally)
mongod

# The application will automatically create collections
# Sample data can be added through the admin panel
```

## 🧪 Testing Guide

### **Access Points**

#### **Frontend Routes** (`http://localhost:3000`)
| Route | Description | Access Level |
|-------|-------------|--------------|
| `/` | Homepage & Product Catalog | Public |
| `/login` | User Login | Public |
| `/register` | User Registration | Public |
| `/products` | Product Listings | Public |
| `/product/:id` | Product Details | Public |
| `/nft` | NFT Marketplace | Public |
| `/dashboard` | User Dashboard | Authenticated |
| `/profile` | User Profile | Authenticated |
| `/seller` | Seller Dashboard | Seller |
| `/admin` | Admin Panel | Admin |
| `/orders` | Order History | Authenticated |
| `/cart` | Shopping Cart | Public |
| `/checkout` | Checkout Process | Authenticated |
| `/track/:id` | Order Tracking | Public |

#### **API Endpoints** (`http://localhost:5000/api`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | User Registration |
| `/auth/login` | POST | User Login |
| `/auth/logout` | POST | User Logout |
| `/products` | GET/POST | Product CRUD |
| `/products/:id` | GET/PUT/DELETE | Single Product |
| `/orders` | GET/POST | Order Management |
| `/reviews` | GET/POST | Review System |
| `/users/profile` | GET/PUT | User Profile |
| `/admin/users` | GET | User Management |
| `/admin/analytics` | GET | Platform Analytics |

### **Test Scenarios**

#### **🛒 E-commerce Testing**
1. **User Registration & Login**
   ```
   1. Go to /register
   2. Fill form (choose buyer/seller)
   3. Verify email (check console for token)
   4. Login with credentials
   5. Access dashboard
   ```

2. **Product Management (Seller)**
   ```
   1. Register as seller
   2. Go to /seller dashboard
   3. Click "Add Product"
   4. Fill product details
   5. Upload images
   6. Publish product
   ```

3. **Shopping Flow (Buyer)**
   ```
   1. Browse products on homepage
   2. Click product for details
   3. Add to cart
   4. Proceed to checkout
   5. Complete purchase
   6. Track order status
   ```

4. **Review System**
   ```
   1. Complete a purchase
   2. Go to order history
   3. Leave product review
   4. Rate seller
   5. Upload review images
   ```

#### **🎨 NFT Testing**
1. **Wallet Connection**
   ```
   1. Install MetaMask
   2. Create/import wallet
   3. Connect to testnet
   4. Get test ETH from faucet
   5. Connect wallet to platform
   ```

2. **NFT Trading**
   ```
   1. Go to /nft marketplace
   2. Browse available NFTs
   3. Purchase with crypto
   4. View in wallet/collection
   ```

#### **👨‍💼 Admin Testing**
1. **Admin Access**
   ```
   1. Create admin user in database
   2. Login as admin
   3. Access /admin panel
   4. Manage users and orders
   5. View analytics dashboard
   ```

### **Test Users**
Create these test users for comprehensive testing:

```javascript
// Buyer Account
{
  email: "buyer@test.com",
  password: "Test123!",
  userType: "buyer"
}

// Seller Account
{
  email: "seller@test.com", 
  password: "Test123!",
  userType: "seller"
}

// Admin Account (set via database)
{
  email: "admin@test.com",
  password: "Test123!",
  userType: "admin",
  isAdmin: true
}
```

## 📚 API Documentation

### **Authentication Endpoints**
```javascript
// Register User
POST /api/auth/register
Body: {
  firstName: "John",
  lastName: "Doe", 
  email: "john@example.com",
  password: "SecurePass123!",
  userType: "buyer" // or "seller"
}

// Login User
POST /api/auth/login
Body: {
  email: "john@example.com",
  password: "SecurePass123!"
}

// Response includes JWT token
Response: {
  token: "jwt-token-here",
  user: { id, email, userType, ... }
}
```

### **Product Endpoints**
```javascript
// Get All Products
GET /api/products
Query: ?page=1&limit=10&category=electronics&search=laptop

// Create Product (Seller only)
POST /api/products
Headers: { Authorization: "Bearer jwt-token" }
Body: FormData with product details + images

// Get Single Product
GET /api/products/:id

// Update Product (Seller only)
PUT /api/products/:id
Headers: { Authorization: "Bearer jwt-token" }

// Delete Product (Seller only)
DELETE /api/products/:id
Headers: { Authorization: "Bearer jwt-token" }
```

### **Order Endpoints**
```javascript
// Create Order
POST /api/orders
Headers: { Authorization: "Bearer jwt-token" }
Body: {
  items: [{ productId, quantity, price }],
  shippingAddress: { ... },
  paymentMethod: "card"
}

// Get User Orders
GET /api/orders
Headers: { Authorization: "Bearer jwt-token" }

// Get Order Details
GET /api/orders/:id
Headers: { Authorization: "Bearer jwt-token" }

// Update Order Status (Seller/Admin)
PUT /api/orders/:id/status
Headers: { Authorization: "Bearer jwt-token" }
Body: { status: "shipped" }
```

## 👥 User Roles & Permissions

### **🛍️ Buyer Permissions**
- Browse and search products
- Add items to cart and wishlist
- Complete purchases
- Leave reviews and ratings
- Track orders
- Manage profile and preferences
- View purchase history
- Connect wallet for NFT purchases

### **🏪 Seller Permissions**
- All buyer permissions
- Add and manage products
- View sales analytics
- Manage inventory
- Respond to customer reviews
- Process orders
- Access seller dashboard
- Upload product images
- Set pricing and discounts

### **👨‍💼 Admin Permissions**
- All buyer and seller permissions
- User management (view, edit, ban)
- Platform analytics
- Dispute resolution
- System configuration
- Audit trail access
- Bulk operations
- Admin panel access
- Security monitoring

## 🚀 Deployment

### **Production Build**
```bash
# Frontend
cd frontend
npm run build
# Creates optimized build in /build folder
# Size: 404.18 kB main JS + 45.91 kB CSS

# Backend
npm run start
# Or use PM2 for production
pm2 start server.js
```

### **Environment Configuration**
```bash
# Production .env
NODE_ENV=production
JWT_SECRET=super-secure-production-secret
MONGODB_URI=mongodb://production-server/blocmerce
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=production-email-password
CLIENT_URL=https://yourdomain.com
PORT=5000
```

### **Deployment Options**
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Backend**: Heroku, DigitalOcean, AWS EC2
- **Database**: MongoDB Atlas, AWS DocumentDB
- **File Storage**: AWS S3, Cloudinary
- **CDN**: CloudFlare, AWS CloudFront

## 🔧 Troubleshooting

### **Common Issues**

#### **Backend Won't Start**
```bash
# Check MongoDB connection
mongo --eval "db.adminCommand('ismaster')"

# Verify environment variables
cat .env

# Check port availability
netstat -ano | findstr :5000
```

#### **Frontend Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for ESLint errors
npm run build
```

#### **Database Connection Issues**
```bash
# Start MongoDB service
sudo systemctl start mongod

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Verify connection string
mongo "mongodb://localhost:27017/blocmerce"
```

#### **Blockchain Connection Issues**
```bash
# Verify MetaMask is installed
window.ethereum

# Check network connection
await window.ethereum.request({ method: 'eth_chainId' })

# Switch to correct network
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x1' }] // Mainnet
})
```

### **Performance Optimization**
- **Frontend**: Code splitting, lazy loading, image optimization
- **Backend**: Database indexing, caching, compression
- **Database**: Proper indexing, query optimization
- **Images**: WebP format, CDN delivery, responsive images

### **Security Best Practices**
- Regular dependency updates
- Environment variable security
- HTTPS in production
- Rate limiting on APIs
- Input validation and sanitization
- Regular security audits

---

## 📞 Support

For technical support or questions:
- Check the troubleshooting section above
- Review API documentation
- Ensure all dependencies are properly installed
- Verify environment configuration

---

**Built with ❤️ using modern web technologies**

*Last updated: December 2024* 