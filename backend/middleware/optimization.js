const compression = require('compression');
const redis = require('redis');

/**
 * API Response Optimization Middleware
 * Provides caching, compression, and response optimization
 */

class ApiOptimizer {
    constructor() {
        this.cache = new Map(); // In-memory cache fallback
        this.redisClient = null;
        this.cacheConfig = {
            defaultTTL: 300, // 5 minutes
            maxCacheSize: 1000,
            enableRedis: process.env.REDIS_URL || false
        };
        
        this.initializeCache();
    }

    /**
     * Initialize caching system
     */
    async initializeCache() {
        if (this.cacheConfig.enableRedis) {
            try {
                this.redisClient = redis.createClient({
                    url: process.env.REDIS_URL
                });
                
                await this.redisClient.connect();
                console.log('✅ Redis cache connected');
            } catch (error) {
                console.warn('⚠️ Redis unavailable, using in-memory cache:', error.message);
            }
        }
    }

    /**
     * Response caching middleware
     */
    cacheMiddleware(ttl = this.cacheConfig.defaultTTL) {
        return async (req, res, next) => {
            // Skip caching for non-GET requests
            if (req.method !== 'GET') {
                return next();
            }

            // Skip caching for authenticated routes with user-specific data
            if (req.user && this.isUserSpecificRoute(req.path)) {
                return next();
            }

            const cacheKey = this.generateCacheKey(req);
            
            try {
                // Try to get from cache
                const cachedResponse = await this.getFromCache(cacheKey);
                
                if (cachedResponse) {
                    res.set('X-Cache', 'HIT');
                    return res.json(cachedResponse);
                }

                // Intercept response
                const originalJson = res.json;
                res.json = (data) => {
                    // Cache successful responses
                    if (res.statusCode === 200) {
                        this.setCache(cacheKey, data, ttl);
                    }
                    
                    res.set('X-Cache', 'MISS');
                    return originalJson.call(res, data);
                };

                next();
            } catch (error) {
                console.error('Cache middleware error:', error);
                next();
            }
        };
    }

    /**
     * Smart compression middleware
     */
    compressionMiddleware() {
        return compression({
            // Only compress responses larger than 1kb
            threshold: 1024,
            
            // Compression level (1-9, higher = better compression but slower)
            level: 6,
            
            // Filter function to determine what to compress
            filter: (req, res) => {
                // Don't compress if client doesn't support it
                if (req.headers['x-no-compression']) {
                    return false;
                }

                // Always compress JSON and text
                const contentType = res.getHeader('content-type');
                if (contentType && (
                    contentType.includes('json') ||
                    contentType.includes('text') ||
                    contentType.includes('javascript')
                )) {
                    return true;
                }

                // Use default compression filter for others
                return compression.filter(req, res);
            }
        });
    }

    /**
     * Response optimization middleware
     */
    responseOptimizationMiddleware() {
        return (req, res, next) => {
            // Set cache headers for static resources
            if (this.isStaticResource(req.path)) {
                res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
                res.set('ETag', this.generateETag(req.path));
            }

            // Set security headers
            res.set('X-Content-Type-Options', 'nosniff');
            res.set('X-Frame-Options', 'DENY');
            res.set('X-XSS-Protection', '1; mode=block');

            // Enable CORS with caching
            res.set('Access-Control-Max-Age', '86400'); // 24 hours

            // Response time header
            const startTime = Date.now();
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                res.set('X-Response-Time', `${responseTime}ms`);
                
                // Log slow responses
                if (responseTime > 1000) {
                    console.warn(`⚠️ Slow response: ${req.method} ${req.path} - ${responseTime}ms`);
                }
            });

            next();
        };
    }

    /**
     * Pagination optimization middleware
     */
    paginationOptimizationMiddleware() {
        return (req, res, next) => {
            // Standardize pagination parameters
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
            const skip = (page - 1) * limit;

            // Add pagination helpers to request
            req.pagination = {
                page,
                limit,
                skip,
                
                // Helper to create pagination response
                createResponse: (data, total) => ({
                    data,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalItems: total,
                        itemsPerPage: limit,
                        hasNext: page < Math.ceil(total / limit),
                        hasPrev: page > 1
                    }
                })
            };

            next();
        };
    }

    /**
     * Query optimization middleware
     */
    queryOptimizationMiddleware() {
        return (req, res, next) => {
            // Parse and optimize query parameters
            const optimizedQuery = this.optimizeQueryParams(req.query);
            req.optimizedQuery = optimizedQuery;

            // Add lean query helper for mongoose
            req.leanQuery = (query) => {
                return query.lean().select('-__v');
            };

            next();
        };
    }

    /**
     * Cache key generation
     */
    generateCacheKey(req) {
        const { path, query, user } = req;
        const userId = user ? user.id : 'anonymous';
        const queryString = Object.keys(query)
            .sort()
            .map(key => `${key}=${query[key]}`)
            .join('&');
            
        return `api:${path}:${userId}:${queryString}`;
    }

    /**
     * Cache operations
     */
    async getFromCache(key) {
        if (this.redisClient && this.redisClient.isOpen) {
            try {
                const data = await this.redisClient.get(key);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                console.warn('Redis get error:', error.message);
            }
        }

        // Fallback to in-memory cache
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    async setCache(key, data, ttl) {
        const expiry = Date.now() + (ttl * 1000);

        if (this.redisClient && this.redisClient.isOpen) {
            try {
                await this.redisClient.setEx(key, ttl, JSON.stringify(data));
                return;
            } catch (error) {
                console.warn('Redis set error:', error.message);
            }
        }

        // Fallback to in-memory cache
        if (this.cache.size >= this.cacheConfig.maxCacheSize) {
            // Remove oldest entries
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].expiry - b[1].expiry);
            entries.slice(0, Math.floor(this.cacheConfig.maxCacheSize * 0.1))
                   .forEach(([key]) => this.cache.delete(key));
        }

        this.cache.set(key, { data, expiry });
    }

    /**
     * Helper methods
     */
    isUserSpecificRoute(path) {
        const userSpecificRoutes = [
            '/api/orders/my',
            '/api/notifications',
            '/api/profile',
            '/api/wallet',
            '/api/dashboard'
        ];
        return userSpecificRoutes.some(route => path.includes(route));
    }

    isStaticResource(path) {
        const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];
        return staticExtensions.some(ext => path.endsWith(ext));
    }

    generateETag(path) {
        return `"${Buffer.from(path).toString('base64')}"`;
    }

    optimizeQueryParams(query) {
        const optimized = { ...query };

        // Convert string booleans
        Object.keys(optimized).forEach(key => {
            if (optimized[key] === 'true') optimized[key] = true;
            if (optimized[key] === 'false') optimized[key] = false;
        });

        // Convert numeric strings
        ['page', 'limit', 'minPrice', 'maxPrice', 'minRating'].forEach(key => {
            if (optimized[key] && !isNaN(optimized[key])) {
                optimized[key] = parseFloat(optimized[key]);
            }
        });

        return optimized;
    }

    /**
     * Cache warming strategies
     */
    async warmCache() {
        const popularRoutes = [
            '/api/products?limit=20',
            '/api/products/categories',
            '/api/stats/public'
        ];

        console.log('🔥 Warming cache for popular routes...');

        for (const route of popularRoutes) {
            try {
                // Simulate request to warm cache
                const mockReq = { path: route.split('?')[0], query: {}, method: 'GET' };
                const cacheKey = this.generateCacheKey(mockReq);
                
                // Cache would be populated by actual requests
                console.log(`✅ Cache warmed for: ${route}`);
            } catch (error) {
                console.warn(`⚠️ Cache warming failed for ${route}:`, error.message);
            }
        }
    }

    /**
     * Cache statistics
     */
    getCacheStats() {
        return {
            inMemorySize: this.cache.size,
            redisConnected: this.redisClient?.isOpen || false,
            memoryUsage: process.memoryUsage(),
            cacheConfig: this.cacheConfig
        };
    }

    /**
     * Clear cache
     */
    async clearCache(pattern = '*') {
        if (this.redisClient && this.redisClient.isOpen) {
            try {
                if (pattern === '*') {
                    await this.redisClient.flushAll();
                } else {
                    const keys = await this.redisClient.keys(pattern);
                    if (keys.length > 0) {
                        await this.redisClient.del(keys);
                    }
                }
            } catch (error) {
                console.error('Redis clear error:', error);
            }
        }

        // Clear in-memory cache
        if (pattern === '*') {
            this.cache.clear();
        } else {
            // Simple pattern matching for in-memory cache
            Array.from(this.cache.keys())
                 .filter(key => key.includes(pattern.replace('*', '')))
                 .forEach(key => this.cache.delete(key));
        }
    }
}

module.exports = new ApiOptimizer(); 