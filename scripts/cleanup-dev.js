#!/usr/bin/env node

/**
 * Development Cleanup Script for Blocmerce
 * Removes development artifacts and prepares for production
 */

const fs = require('fs');
const path = require('path');

class DevCleanup {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.frontendDir = path.join(this.rootDir, 'frontend', 'src');
    this.backendDir = path.join(this.rootDir, 'backend');
  }

  log(message) {
    console.log(`🧹 ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  // Remove console statements from JavaScript files
  removeConsoleStatements(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Remove various console statements but keep console.error
      const patterns = [
        /console\.log\([^)]*\);?\s*\n?/g,
        /console\.debug\([^)]*\);?\s*\n?/g,
        /console\.info\([^)]*\);?\s*\n?/g,
        /console\.warn\([^)]*\);?\s*\n?/g,
        /\/\/\s*console\.[^;\n]*;?\s*\n?/g,
        /\/\*.*?console\..*?\*\/\s*\n?/gs
      ];

      patterns.forEach(pattern => {
        const newContent = content.replace(pattern, '');
        if (newContent !== content) {
          modified = true;
          content = newContent;
        }
      });

      if (modified) {
        fs.writeFileSync(filePath, content);
        return true;
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
    return false;
  }

  // Find all JavaScript files recursively
  findJSFiles(dir, exclude = []) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      // Skip excluded directories
      if (exclude.some(ex => fullPath.includes(ex))) {
        return;
      }
      
      if (stat.isDirectory()) {
        files.push(...this.findJSFiles(fullPath, exclude));
      } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  // Clean frontend files
  cleanFrontend() {
    this.log('Cleaning frontend console statements...');
    
    const exclude = [
      'node_modules',
      'build',
      'coverage',
      'dist',
      '.git',
      'logger.js',
      'logger.production.js'
    ];
    
    const jsFiles = this.findJSFiles(this.frontendDir, exclude);
    let cleanedCount = 0;
    
    jsFiles.forEach(file => {
      if (this.removeConsoleStatements(file)) {
        cleanedCount++;
        this.log(`Cleaned: ${path.relative(this.rootDir, file)}`);
      }
    });
    
    this.success(`Frontend: ${cleanedCount} files cleaned`);
  }

  // Clean backend files
  cleanBackend() {
    this.log('Cleaning backend console statements...');
    
    const exclude = [
      'node_modules',
      'logs',
      'uploads',
      '.git',
      'logger.js',
      'config/logger.js'
    ];
    
    const jsFiles = this.findJSFiles(this.backendDir, exclude);
    let cleanedCount = 0;
    
    jsFiles.forEach(file => {
      if (this.removeConsoleStatements(file)) {
        cleanedCount++;
        this.log(`Cleaned: ${path.relative(this.rootDir, file)}`);
      }
    });
    
    this.success(`Backend: ${cleanedCount} files cleaned`);
  }

  // Remove TODO and FIXME comments
  removeTodoComments() {
    this.log('Removing TODO/FIXME comments...');
    
    const exclude = ['node_modules', '.git', 'build', 'dist'];
    const allFiles = [
      ...this.findJSFiles(this.frontendDir, exclude),
      ...this.findJSFiles(this.backendDir, exclude)
    ];
    
    let cleanedCount = 0;
    
    allFiles.forEach(file => {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const originalContent = content;
        
        // Remove TODO and FIXME comments
        content = content.replace(/\/\/\s*(TODO|FIXME|HACK|XXX).*$/gm, '');
        content = content.replace(/\/\*\s*(TODO|FIXME|HACK|XXX).*?\*\//gs, '');
        
        if (content !== originalContent) {
          fs.writeFileSync(file, content);
          cleanedCount++;
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
      }
    });
    
    this.success(`Removed TODO comments from ${cleanedCount} files`);
  }

  // Clean temporary files
  cleanTempFiles() {
    this.log('Cleaning temporary files...');
    
    const tempDirs = [
      path.join(this.rootDir, 'logs'),
      path.join(this.rootDir, 'uploads', 'temp'),
      path.join(this.frontendDir, 'build'),
      path.join(this.rootDir, 'coverage'),
      path.join(this.rootDir, '.nyc_output')
    ];
    
    let cleanedDirs = 0;
    
    tempDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        cleanedDirs++;
        this.log(`Removed: ${path.relative(this.rootDir, dir)}`);
      }
    });
    
    this.success(`Cleaned ${cleanedDirs} temporary directories`);
  }

  // Validate no console statements remain
  validateClean() {
    this.log('Validating cleanup...');
    
    const exclude = ['node_modules', '.git', 'logger', 'build', 'dist'];
    const allFiles = [
      ...this.findJSFiles(this.frontendDir, exclude),
      ...this.findJSFiles(this.backendDir, exclude)
    ];
    
    let issuesFound = 0;
    
    allFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for remaining console statements (except console.error)
        const consoleMatches = content.match(/console\.(log|debug|info|warn)\(/g);
        if (consoleMatches) {
          console.warn(`⚠️  Found console statements in: ${path.relative(this.rootDir, file)}`);
          issuesFound++;
        }
        
        // Check for remaining TODO comments
        const todoMatches = content.match(/(TODO|FIXME|HACK|XXX)/g);
        if (todoMatches) {
          console.warn(`⚠️  Found TODO comments in: ${path.relative(this.rootDir, file)}`);
          issuesFound++;
        }
      } catch (error) {
        console.error(`Error validating ${file}:`, error.message);
      }
    });
    
    if (issuesFound === 0) {
      this.success('Validation passed - no issues found');
    } else {
      console.warn(`⚠️  Found ${issuesFound} files with remaining issues`);
    }
  }

  // Main cleanup process
  async run() {
    console.log('🚀 Starting Development Cleanup\n');
    
    try {
      this.cleanTempFiles();
      this.cleanFrontend();
      this.cleanBackend();
      this.removeTodoComments();
      this.validateClean();
      
      console.log('\n🎉 Development cleanup completed successfully!');
      console.log('📦 Project is now ready for production build');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const cleanup = new DevCleanup();
  cleanup.run();
}

module.exports = DevCleanup; 