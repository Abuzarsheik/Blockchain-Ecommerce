#!/usr/bin/env node

/**
 * Production Build Script for Blocmerce
 * Ensures clean, optimized builds for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProductionBuilder {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.frontendDir = path.join(this.rootDir, 'frontend');
    this.backendDir = path.join(this.rootDir, 'backend');
  }

  log(message) {
    console.log(`🏗️  ${message}`);
  }

  error(message) {
    console.error(`❌ ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  // Check if required environment variables are set
  checkEnvironment() {
    this.log('Checking environment configuration...');
    
    const requiredEnvVars = [
      'NODE_ENV',
      'MONGODB_URI',
      'JWT_SECRET',
      'REACT_APP_API_URL'
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
      this.error(`Missing required environment variables: ${missing.join(', ')}`);
      this.error('Please create a .env file based on env.example');
      process.exit(1);
    }

    if (process.env.NODE_ENV !== 'production') {
      this.error('NODE_ENV must be set to "production" for production builds');
      process.exit(1);
    }

    this.success('Environment configuration valid');
  }

  // Clean previous builds
  cleanBuilds() {
    this.log('Cleaning previous builds...');
    
    const dirsToClean = [
      path.join(this.frontendDir, 'build'),
      path.join(this.rootDir, 'dist'),
      path.join(this.rootDir, 'logs'),
      path.join(this.rootDir, 'uploads', 'temp')
    ];

    dirsToClean.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        this.log(`Cleaned ${dir}`);
      }
    });

    this.success('Build directories cleaned');
  }

  // Install dependencies
  installDependencies() {
    this.log('Installing dependencies...');
    
    try {
      // Install backend dependencies
      process.chdir(this.rootDir);
      execSync('npm ci --only=production', { stdio: 'inherit' });
      
      // Install frontend dependencies
      process.chdir(this.frontendDir);
      execSync('npm ci', { stdio: 'inherit' });
      
      this.success('Dependencies installed');
    } catch (error) {
      this.error('Failed to install dependencies');
      process.exit(1);
    }
  }

  // Build frontend
  buildFrontend() {
    this.log('Building frontend for production...');
    
    try {
      process.chdir(this.frontendDir);
      execSync('npm run build', { stdio: 'inherit' });
      
      // Verify build was created
      const buildDir = path.join(this.frontendDir, 'build');
      if (!fs.existsSync(buildDir)) {
        throw new Error('Build directory not created');
      }

      this.success('Frontend build completed');
    } catch (error) {
      this.error('Frontend build failed');
      process.exit(1);
    }
  }

  // Run security audit
  securityAudit() {
    this.log('Running security audit...');
    
    try {
      process.chdir(this.rootDir);
      execSync('npm audit --audit-level=high', { stdio: 'inherit' });
      
      process.chdir(this.frontendDir);
      execSync('npm audit --audit-level=high', { stdio: 'inherit' });
      
      this.success('Security audit passed');
    } catch (error) {
      this.error('Security vulnerabilities found - please fix before deploying');
      process.exit(1);
    }
  }

  // Validate production readiness
  validateProduction() {
    this.log('Validating production readiness...');
    
    const checks = [
      {
        name: 'Environment file not in build',
        check: () => !fs.existsSync(path.join(this.frontendDir, 'build', '.env'))
      },
      {
        name: 'No console.log in production build',
        check: () => {
          const buildFiles = this.getJSFiles(path.join(this.frontendDir, 'build'));
          return !buildFiles.some(file => {
            const content = fs.readFileSync(file, 'utf8');
            return content.includes('console.log') && !content.includes('console.error');
          });
        }
      },
      {
        name: 'Build size reasonable',
        check: () => {
          const buildSize = this.getDirSize(path.join(this.frontendDir, 'build'));
          return buildSize < 50 * 1024 * 1024; // 50MB limit
        }
      }
    ];

    let allPassed = true;
    checks.forEach(({ name, check }) => {
      if (check()) {
        this.success(name);
      } else {
        this.error(name);
        allPassed = false;
      }
    });

    if (!allPassed) {
      this.error('Production validation failed');
      process.exit(1);
    }

    this.success('Production validation passed');
  }

  // Helper methods
  getJSFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getJSFiles(fullPath));
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  getDirSize(dir) {
    if (!fs.existsSync(dir)) return 0;
    
    let size = 0;
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        size += this.getDirSize(fullPath);
      } else {
        size += stat.size;
      }
    });
    
    return size;
  }

  // Main build process
  async build() {
    console.log('🚀 Starting Blocmerce Production Build\n');
    
    try {
      this.checkEnvironment();
      this.cleanBuilds();
      this.installDependencies();
      this.securityAudit();
      this.buildFrontend();
      this.validateProduction();
      
      console.log('\n🎉 Production build completed successfully!');
      console.log('📦 Build artifacts:');
      console.log(`   Frontend: ${path.join(this.frontendDir, 'build')}`);
      console.log('\n🚀 Ready for deployment!');
      
    } catch (error) {
      this.error(`Build failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const builder = new ProductionBuilder();
  builder.build();
}

module.exports = ProductionBuilder; 