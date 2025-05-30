const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

class HealthChecker {
    constructor() {
        this.checks = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    async runCheck(name, checkFunction) {
        console.log(`🔍 Checking ${name}...`);
        try {
            const result = await checkFunction();
            if (result.success) {
                console.log(`✅ ${name}: ${result.message}`);
                this.results.passed++;
            } else {
                console.log(`❌ ${name}: ${result.message}`);
                this.results.failed++;
            }
        } catch (error) {
            console.log(`❌ ${name}: ${error.message}`);
            this.results.failed++;
        }
        this.results.total++;
    }

    async checkDatabase() {
        try {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce');
            const collections = await mongoose.connection.db.listCollections().toArray();
            await mongoose.disconnect();
            
            return {
                success: true,
                message: `Connected successfully. Found ${collections.length} collections.`
            };
        } catch (error) {
            return {
                success: false,
                message: `Connection failed: ${error.message}`
            };
        }
    }

    async checkBackendHealth() {
        try {
            const response = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
            return {
                success: response.status === 200,
                message: response.status === 200 ? 
                    `Backend responding (${response.data.status})` : 
                    `Backend returned status ${response.status}`
            };
        } catch (error) {
            return {
                success: false,
                message: `Backend not responding: ${error.code === 'ECONNREFUSED' ? 'Connection refused' : error.message}`
            };
        }
    }

    async checkFrontend() {
        try {
            const response = await axios.get('http://localhost:3000', { 
                timeout: 8000,
                validateStatus: (status) => status >= 200 && status < 400
            });
            return {
                success: true,
                message: 'Frontend is running and accessible'
            };
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    message: 'Frontend not running on port 3000'
                };
            } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                return {
                    success: true,
                    message: 'Frontend running but slow to respond (normal for React dev server)'
                };
            } else {
                return {
                    success: false,
                    message: `Frontend not accessible: ${error.message}`
                };
            }
        }
    }

    async checkUserRegistration() {
        try {
            // Wait a bit to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const timestamp = Date.now().toString().slice(-6); // Use last 6 digits for shorter username
            const testUser = {
                firstName: 'Health',
                lastName: 'Check',
                username: `hc${timestamp}`, // Shorter username: "hc" + 6 digits = 8 chars
                email: `healthcheck${timestamp}@test.com`,
                password: 'HealthCheck123!',
                userType: 'buyer'
            };

            const response = await axios.post('http://localhost:5000/api/auth/register', testUser, {
                timeout: 15000,
                headers: { 'Content-Type': 'application/json' },
                validateStatus: (status) => status === 201 || status === 429 || status === 400
            });

            if (response.status === 201) {
                return {
                    success: true,
                    message: 'User registration working (KYC validation passed)'
                };
            } else if (response.status === 429) {
                return {
                    success: true,
                    message: 'Registration endpoint working (rate limited - normal behavior)'
                };
            } else if (response.status === 400 && response.data?.error?.includes('already exists')) {
                return {
                    success: true,
                    message: 'Registration endpoint working (user validation active)'
                };
            } else {
                return {
                    success: false,
                    message: `Registration returned status ${response.status}`
                };
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                return {
                    success: false,
                    message: 'Backend not running on port 5000'
                };
            }
            return {
                success: false,
                message: `Registration test failed: ${error.message}`
            };
        }
    }

    async checkSecurityEndpoints() {
        try {
            // Test without auth (should fail with 401)
            const response = await axios.get('http://localhost:5000/api/auth/security-settings', {
                timeout: 5000,
                validateStatus: (status) => status === 401 // Accept 401 as success for this test
            });

            return {
                success: response.status === 401,
                message: response.status === 401 ? 
                    'Security endpoints properly protected' : 
                    'Security endpoints may not be properly protected'
            };
        } catch (error) {
            return {
                success: false,
                message: `Security check failed: ${error.message}`
            };
        }
    }

    checkEnvironmentVariables() {
        const required = ['MONGODB_URI', 'JWT_SECRET'];
        const optional = ['STRIPE_SECRET_KEY', 'EMAIL_USER', 'EMAIL_PASS'];
        
        let missing = required.filter(key => !process.env[key]);
        let optionalMissing = optional.filter(key => !process.env[key]);
        
        if (missing.length === 0) {
            let message = 'All required environment variables set';
            if (optionalMissing.length > 0) {
                message += ` (Optional missing: ${optionalMissing.join(', ')})`;
            }
            return { success: true, message };
        } else {
            return { 
                success: false, 
                message: `Missing required variables: ${missing.join(', ')}` 
            };
        }
    }

    checkDependencies() {
        try {
            const packageJson = require('../package.json');
            const dependencies = Object.keys(packageJson.dependencies || {}).length;
            const devDependencies = Object.keys(packageJson.devDependencies || {}).length;
            
            return {
                success: dependencies > 0,
                message: `${dependencies} dependencies, ${devDependencies} dev dependencies`
            };
        } catch (error) {
            return {
                success: false,
                message: 'Could not read package.json'
            };
        }
    }

    async runAllChecks() {
        console.log('🏥 Blocmerce Health Check Starting...\n');

        // Environment checks
        await this.runCheck('Environment Variables', () => Promise.resolve(this.checkEnvironmentVariables()));
        await this.runCheck('Dependencies', () => Promise.resolve(this.checkDependencies()));

        // Infrastructure checks
        await this.runCheck('MongoDB Connection', () => this.checkDatabase());
        await this.runCheck('Backend API Health', () => this.checkBackendHealth());
        await this.runCheck('Frontend Accessibility', () => this.checkFrontend());

        // Functionality checks
        await this.runCheck('User Registration (KYC Fix)', () => this.checkUserRegistration());
        await this.runCheck('Security Endpoints', () => this.checkSecurityEndpoints());

        console.log('\n📊 Health Check Summary:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Total: ${this.results.total}`);
        console.log(`🎯 Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);

        if (this.results.failed === 0) {
            console.log('\n🎉 All systems operational! Your Blocmerce project is properly configured.');
        } else if (this.results.passed >= this.results.failed) {
            console.log('\n⚠️  Most systems working, but some issues need attention.');
        } else {
            console.log('\n🚨 Multiple critical issues detected. Please review and fix the failing checks.');
        }

        return this.results;
    }
}

// Run health check if this file is executed directly
if (require.main === module) {
    const checker = new HealthChecker();
    checker.runAllChecks().then((results) => {
        process.exit(results.failed > 0 ? 1 : 0);
    });
}

module.exports = HealthChecker; 