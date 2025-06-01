/**
 * 🔒 ADVANCED SECURITY FRAMEWORK
 * Enhanced security features for Blocmerce NFT Marketplace
 * Zero risk implementation - works independently
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class AdvancedSecurityFramework {
    constructor() {
        this.rateLimits = new Map();
        this.blockedIPs = new Set();
        this.suspiciousActivity = new Map();
        this.securityLogs = [];
        this.config = {
            maxRequestsPerMinute: 60,
            maxRequestsPerHour: 1000,
            blockDuration: 15 * 60 * 1000, // 15 minutes
            suspiciousThreshold: 10,
            logRetentionDays: 30
        };
        
        this.init();
    }

    async init() {
        try {
            await this.loadBlockedIPs();
            await this.loadSecurityLogs();
            this.startCleanupInterval();
            console.log('🔒 Advanced Security Framework initialized');
        } catch (error) {
            console.warn('⚠️ Security framework initialization warning:', error.message);
        }
    }

    // Rate limiting middleware
    rateLimitMiddleware() {
        return (req, res, next) => {
            const clientIP = this.getClientIP(req);
            
            // Check if IP is blocked
            if (this.isIPBlocked(clientIP)) {
                this.logSecurityEvent('blocked_request', {
                    ip: clientIP,
                    url: req.url,
                    userAgent: req.get('User-Agent')
                });
                
                return res.status(429).json({
                    success: false,
                    error: 'IP temporarily blocked due to suspicious activity',
                    retryAfter: this.config.blockDuration / 1000
                });
            }

            // Check rate limits
            const rateLimit = this.checkRateLimit(clientIP);
            if (!rateLimit.allowed) {
                this.handleRateLimitExceeded(clientIP, req);
                
                return res.status(429).json({
                    success: false,
                    error: 'Rate limit exceeded',
                    retryAfter: rateLimit.retryAfter
                });
            }

            // Add security headers
            this.addSecurityHeaders(res);
            
            next();
        };
    }

    // Check rate limits for IP
    checkRateLimit(ip) {
        const now = Date.now();
        const minute = Math.floor(now / 60000);
        const hour = Math.floor(now / 3600000);
        
        if (!this.rateLimits.has(ip)) {
            this.rateLimits.set(ip, {
                minute: { count: 0, window: minute },
                hour: { count: 0, window: hour },
                lastRequest: now
            });
        }

        const limits = this.rateLimits.get(ip);

        // Reset counters if window changed
        if (limits.minute.window !== minute) {
            limits.minute = { count: 0, window: minute };
        }
        if (limits.hour.window !== hour) {
            limits.hour = { count: 0, window: hour };
        }

        // Increment counters
        limits.minute.count++;
        limits.hour.count++;
        limits.lastRequest = now;

        // Check limits
        if (limits.minute.count > this.config.maxRequestsPerMinute) {
            return { allowed: false, retryAfter: 60 };
        }
        if (limits.hour.count > this.config.maxRequestsPerHour) {
            return { allowed: false, retryAfter: 3600 };
        }

        return { allowed: true };
    }

    // Handle rate limit exceeded
    handleRateLimitExceeded(ip, req) {
        this.incrementSuspiciousActivity(ip);
        
        this.logSecurityEvent('rate_limit_exceeded', {
            ip: ip,
            url: req.url,
            userAgent: req.get('User-Agent'),
            method: req.method
        });

        // Block IP if too many violations
        const suspiciousCount = this.suspiciousActivity.get(ip) || 0;
        if (suspiciousCount >= this.config.suspiciousThreshold) {
            this.blockIP(ip, 'Repeated rate limit violations');
        }
    }

    // Block IP address
    blockIP(ip, reason) {
        this.blockedIPs.add(ip);
        
        this.logSecurityEvent('ip_blocked', {
            ip: ip,
            reason: reason,
            duration: this.config.blockDuration
        });

        // Auto-unblock after duration
        setTimeout(() => {
            this.unblockIP(ip);
        }, this.config.blockDuration);

        console.log(`🚫 IP blocked: ${ip} - ${reason}`);
    }

    // Unblock IP address
    unblockIP(ip) {
        this.blockedIPs.delete(ip);
        this.suspiciousActivity.delete(ip);
        
        this.logSecurityEvent('ip_unblocked', {
            ip: ip
        });

        console.log(`✅ IP unblocked: ${ip}`);
    }

    // Check if IP is blocked
    isIPBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    // Increment suspicious activity counter
    incrementSuspiciousActivity(ip) {
        const current = this.suspiciousActivity.get(ip) || 0;
        this.suspiciousActivity.set(ip, current + 1);
    }

    // Get client IP address
    getClientIP(req) {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               '127.0.0.1';
    }

    // Add security headers
    addSecurityHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    }

    // Input validation and sanitization
    validateInput(input, type = 'string', options = {}) {
        if (input === null || input === undefined) {
            return { valid: false, error: 'Input is required' };
        }

        switch (type) {
            case 'email':
                return this.validateEmail(input);
            case 'password':
                return this.validatePassword(input, options);
            case 'string':
                return this.validateString(input, options);
            case 'number':
                return this.validateNumber(input, options);
            case 'url':
                return this.validateURL(input);
            default:
                return { valid: true, sanitized: input };
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email);
        
        return {
            valid: isValid,
            sanitized: isValid ? email.toLowerCase().trim() : null,
            error: isValid ? null : 'Invalid email format'
        };
    }

    validatePassword(password, options = {}) {
        const minLength = options.minLength || 8;
        const requireSpecial = options.requireSpecial !== false;
        const requireNumber = options.requireNumber !== false;
        const requireUppercase = options.requireUppercase !== false;

        const errors = [];

        if (password.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters long`);
        }

        if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        if (requireNumber && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        return {
            valid: errors.length === 0,
            sanitized: password,
            error: errors.length > 0 ? errors.join(', ') : null
        };
    }

    validateString(str, options = {}) {
        const maxLength = options.maxLength || 1000;
        const minLength = options.minLength || 0;
        const allowHTML = options.allowHTML || false;

        if (str.length < minLength) {
            return { valid: false, error: `String must be at least ${minLength} characters` };
        }

        if (str.length > maxLength) {
            return { valid: false, error: `String must be no more than ${maxLength} characters` };
        }

        let sanitized = str.trim();
        
        if (!allowHTML) {
            // Remove HTML tags
            sanitized = sanitized.replace(/<[^>]*>/g, '');
        }

        return { valid: true, sanitized };
    }

    validateNumber(num, options = {}) {
        const min = options.min;
        const max = options.max;
        const integer = options.integer || false;

        const parsed = integer ? parseInt(num) : parseFloat(num);

        if (isNaN(parsed)) {
            return { valid: false, error: 'Invalid number format' };
        }

        if (min !== undefined && parsed < min) {
            return { valid: false, error: `Number must be at least ${min}` };
        }

        if (max !== undefined && parsed > max) {
            return { valid: false, error: `Number must be no more than ${max}` };
        }

        return { valid: true, sanitized: parsed };
    }

    validateURL(url) {
        try {
            new URL(url);
            return { valid: true, sanitized: url };
        } catch {
            return { valid: false, error: 'Invalid URL format' };
        }
    }

    // Generate secure token
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Hash password with salt
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return { hash, salt };
    }

    // Verify password
    verifyPassword(password, hash, salt) {
        const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }

    // Log security events
    logSecurityEvent(type, data) {
        const event = {
            timestamp: new Date().toISOString(),
            type: type,
            data: data,
            id: this.generateSecureToken(8)
        };

        this.securityLogs.push(event);
        
        // Keep only recent logs in memory
        if (this.securityLogs.length > 1000) {
            this.securityLogs = this.securityLogs.slice(-500);
        }

        console.log(`🔒 Security Event [${type}]:`, data);
    }

    // Get security statistics
    getSecurityStats() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        const oneDay = 24 * oneHour;

        const recentLogs = this.securityLogs.filter(log => 
            new Date(log.timestamp).getTime() > now - oneDay
        );

        const stats = {
            blockedIPs: this.blockedIPs.size,
            activeRateLimits: this.rateLimits.size,
            suspiciousIPs: this.suspiciousActivity.size,
            eventsLast24h: recentLogs.length,
            eventsLastHour: recentLogs.filter(log => 
                new Date(log.timestamp).getTime() > now - oneHour
            ).length,
            eventTypes: {}
        };

        // Count event types
        recentLogs.forEach(log => {
            stats.eventTypes[log.type] = (stats.eventTypes[log.type] || 0) + 1;
        });

        return stats;
    }

    // Load blocked IPs from file
    async loadBlockedIPs() {
        try {
            const filePath = path.join(__dirname, 'blocked-ips.json');
            const data = await fs.readFile(filePath, 'utf8');
            const blockedData = JSON.parse(data);
            
            blockedData.forEach(item => {
                if (Date.now() - item.timestamp < this.config.blockDuration) {
                    this.blockedIPs.add(item.ip);
                }
            });
        } catch (error) {
            // File doesn't exist or is corrupted, start fresh
        }
    }

    // Save blocked IPs to file
    async saveBlockedIPs() {
        try {
            const filePath = path.join(__dirname, 'blocked-ips.json');
            const blockedData = Array.from(this.blockedIPs).map(ip => ({
                ip: ip,
                timestamp: Date.now()
            }));
            
            await fs.writeFile(filePath, JSON.stringify(blockedData, null, 2));
        } catch (error) {
            console.warn('Failed to save blocked IPs:', error.message);
        }
    }

    // Load security logs
    async loadSecurityLogs() {
        try {
            const filePath = path.join(__dirname, 'security-logs.json');
            const data = await fs.readFile(filePath, 'utf8');
            this.securityLogs = JSON.parse(data);
        } catch (error) {
            // File doesn't exist, start fresh
            this.securityLogs = [];
        }
    }

    // Save security logs
    async saveSecurityLogs() {
        try {
            const filePath = path.join(__dirname, 'security-logs.json');
            await fs.writeFile(filePath, JSON.stringify(this.securityLogs, null, 2));
        } catch (error) {
            console.warn('Failed to save security logs:', error.message);
        }
    }

    // Cleanup old data
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupOldData();
        }, 60 * 60 * 1000); // Every hour
    }

    cleanupOldData() {
        const now = Date.now();
        const retentionTime = this.config.logRetentionDays * 24 * 60 * 60 * 1000;

        // Clean old logs
        this.securityLogs = this.securityLogs.filter(log => 
            now - new Date(log.timestamp).getTime() < retentionTime
        );

        // Clean old rate limit data
        for (const [ip, data] of this.rateLimits.entries()) {
            if (now - data.lastRequest > 60 * 60 * 1000) { // 1 hour
                this.rateLimits.delete(ip);
            }
        }

        // Save cleaned data
        this.saveSecurityLogs();
        this.saveBlockedIPs();
    }
}

module.exports = AdvancedSecurityFramework; 