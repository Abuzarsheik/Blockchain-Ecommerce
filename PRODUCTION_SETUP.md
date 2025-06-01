# 🚀 Blocmerce Production Setup Guide

This guide will help you configure all services to move from development mode to production.

## 📧 1. EMAIL CONFIGURATION (SMTP)

### Option A: Gmail Setup (Recommended for Development)

1. **Enable 2FA on your Gmail account**
2. **Generate App Password:**
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"

3. **Add to your `.env` file:**
```env
EMAIL_SERVICE_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Blocmerce Platform
```

### Option B: SendGrid (Recommended for Production)

1. **Create SendGrid account:** https://sendgrid.com
2. **Get API key from Settings → API Keys**
3. **Add to `.env`:**
```env
EMAIL_SERVICE_ENABLED=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Blocmerce Platform
```

---

## 🗂️ 2. IPFS CONFIGURATION

### Option A: Local IPFS Node (Development)

1. **Install IPFS:**
```bash
# Windows (using Chocolatey)
choco install ipfs

# Or download from: https://ipfs.io/docs/install/
```

2. **Initialize and start IPFS:**
```bash
ipfs init
ipfs daemon
```

3. **Add to `.env`:**
```env
IPFS_ENABLED=true
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
```

### Option B: Pinata Cloud (Production)

1. **Create Pinata account:** https://pinata.cloud
2. **Get API keys from Account → API Keys**
3. **Add to `.env`:**
```env
IPFS_ENABLED=true
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_API_KEY=your-pinata-secret-key
```

---

## ⛓️ 3. BLOCKCHAIN CONFIGURATION

### Step 1: Get Infura Account (Free)

1. **Sign up at:** https://infura.io
2. **Create new project**
3. **Copy Project ID**

### Step 2: Get API Keys

1. **Etherscan:** https://etherscan.io/apis
2. **Polygonscan:** https://polygonscan.com/apis

### Step 3: Add to `.env`

```env
BLOCKCHAIN_ENABLED=true

# Ethereum Sepolia Testnet
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# Polygon Mumbai Testnet  
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY

# Primary RPC (Sepolia for testing)
RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

### Step 4: Deploy Smart Contracts

```bash
# Deploy to Sepolia testnet
npm run deploy:sepolia

# Deploy to Mumbai testnet
npm run deploy:mumbai
```

---

## 💳 4. STRIPE CONFIGURATION

### Step 1: Create Stripe Account

1. **Sign up at:** https://stripe.com
2. **Complete account verification**

### Step 2: Get API Keys

1. **Go to Developers → API keys**
2. **Copy Publishable key and Secret key**
3. **For webhooks: Developers → Webhooks → Add endpoint**

### Step 3: Add to `.env`

```env
STRIPE_ENABLED=true
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

---

## 🚀 QUICK START COMMANDS

### 1. Copy Environment File
```bash
# Copy the example and edit with your credentials
copy .env.production.example .env
# Edit .env with your actual credentials
```

### 2. Install and Start Services
```bash
# Install IPFS (if using local node)
choco install ipfs
ipfs init
ipfs daemon

# Start your application
npm start
```

### 3. Verify All Services
Visit: http://localhost:5000/api/health

You should see all services showing as "connected" instead of "development_mode"

---

## 🔧 TROUBLESHOOTING

### Email Issues
- **Gmail "Less secure apps"**: Use App Passwords instead
- **Wrong credentials**: Check username/password
- **Port blocked**: Try port 465 with SMTP_SECURE=true

### IPFS Issues
- **Connection refused**: Make sure `ipfs daemon` is running
- **Port conflict**: IPFS uses port 5001, might conflict with your app

### Blockchain Issues
- **Invalid RPC URL**: Check your Infura project ID
- **Network mismatch**: Ensure you're using the correct network

### Stripe Issues
- **Invalid keys**: Make sure you're using the correct environment keys
- **Webhook verification**: Check webhook secret matches

---

## 📋 PRODUCTION CHECKLIST

- [ ] ✅ Email service configured and tested
- [ ] 🗂️ IPFS node running and accessible  
- [ ] ⛓️ Blockchain RPC URLs configured
- [ ] 💳 Stripe API keys added
- [ ] 🔒 JWT secret changed from default
- [ ] 🗄️ MongoDB connection string updated
- [ ] 🌐 CORS origin set to production domain
- [ ] 🔐 All sensitive data in environment variables

Once completed, restart your server and all 7/7 services should show as operational! 🎉 