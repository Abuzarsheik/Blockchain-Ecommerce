const fs = require('fs');
const path = require('path');

// Common fixes for ESLint errors
const fixes = [
  // Add logger import if logger is used but not imported
  {
    pattern: /(logger\.(error|info|warn|debug))/,
    hasImport: /const logger = require/,
    fix: (content, filePath) => {
      if (content.includes('logger.') && !content.includes("const logger = require")) {
        const lines = content.split('\n');
        let insertIndex = 0;
        
        // Find where to insert the logger import (after other requires)
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('require(') && !lines[i].includes('logger')) {
            insertIndex = i + 1;
          }
          if (!lines[i].includes('require(') && insertIndex > 0) {
            break;
          }
        }
        
        // Insert logger import
        lines.splice(insertIndex, 0, "const logger = require('../config/logger');");
        return lines.join('\n');
      }
      return content;
    }
  },
  
  // Fix unused variables by prefixing with underscore
  {
    pattern: /'/,
    fix: (content, filePath) => {
      return content
        .replace(/(\w+) is assigned a value but never used/g, '_$1 is assigned a value but never used')
        .replace(/(\w+) is defined but never used/g, '_$1 is defined but never used');
    }
  },
  
  // Fix unnecessary escape characters in regex
  {
    pattern: /\\[\+\(\)]/g,
    fix: (content) => {
      return content
        .replace(/\\\+/g, '+')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')');
    }
  },
  
  // Fix process.exit usage
  {
    pattern: /process\.exit\(/g,
    fix: (content) => {
      return content.replace(
        /process\.exit\((\d+)\);/g, 
        'throw new Error(`Process exit with code $1`);'
      );
    }
  }
];

// Function to fix a single file
function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  fixes.forEach(fix => {
    if (fix.pattern.test(content)) {
      const newContent = fix.fix(content, filePath);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

// Function to recursively find and fix files
function fixDirectory(dir, extensions = ['.js', '.jsx']) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(file)) {
      fixedCount += fixDirectory(filePath, extensions);
    } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
      if (fixFile(filePath)) {
        fixedCount++;
      }
    }
  });
  
  return fixedCount;
}

// Main execution
console.log('🔧 Starting ESLint auto-fix...\n');

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend', 'src');
const serverFile = path.join(__dirname, 'server.js');

let totalFixed = 0;

// Fix backend files
if (fs.existsSync(backendDir)) {
  console.log('📁 Fixing backend files...');
  totalFixed += fixDirectory(backendDir);
}

// Fix frontend files
if (fs.existsSync(frontendDir)) {
  console.log('📁 Fixing frontend files...');
  totalFixed += fixDirectory(frontendDir);
}

// Fix server.js
if (fs.existsSync(serverFile)) {
  console.log('📁 Fixing server.js...');
  if (fixFile(serverFile)) {
    totalFixed++;
  }
}

console.log(`\n🎉 Completed! Fixed ${totalFixed} files.`);
console.log('👀 Please review the changes and run ESLint again to check remaining issues.'); 