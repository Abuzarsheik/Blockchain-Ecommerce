# ==============================================
# BLOCMERCE PRODUCTION DOCKERFILE
# ==============================================

# Build stage for frontend
FROM node:18-alpine AS frontend-builder

# Set working directory
WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ .

# Build frontend
RUN npm run build

# Backend stage
FROM node:18-alpine AS backend

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S blocmerce -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create uploads directory with proper permissions
RUN mkdir -p uploads/products uploads/nfts uploads/kyc uploads/avatars uploads/disputes uploads/reviews uploads/ipfs-fallback && \
    chown -R blocmerce:nodejs uploads && \
    chmod -R 755 uploads

# Set proper file permissions
RUN chown -R blocmerce:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER blocmerce

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Expose port
EXPOSE 5000

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# ==============================================
# PRODUCTION DOCKER COMPOSE CONFIGURATION
# ==============================================

# docker-compose.prod.yml
#
# version: '3.8'
# services:
#   blocmerce:
#     build: .
#     ports:
#       - "5000:5000"
#     environment:
#       NODE_ENV: production
#       MONGODB_URI: mongodb://mongo:27017/blocmerce
#     depends_on:
#       - mongo
#       - redis
#     restart: unless-stopped
#     volumes:
#       - uploads:/app/uploads
#       - logs:/app/logs
#     networks:
#       - blocmerce-network
#
#   mongo:
#     image: mongo:6.0
#     restart: unless-stopped
#     volumes:
#       - mongo-data:/data/db
#     environment:
#       MONGO_INITDB_ROOT_USERNAME: admin
#       MONGO_INITDB_ROOT_PASSWORD: your_secure_password
#     networks:
#       - blocmerce-network
#
#   redis:
#     image: redis:7-alpine
#     restart: unless-stopped
#     volumes:
#       - redis-data:/data
#     networks:
#       - blocmerce-network
#
# volumes:
#   mongo-data:
#   redis-data:
#   uploads:
#   logs:
#
# networks:
#   blocmerce-network:
#     driver: bridge 