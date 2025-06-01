const fs = require('fs');
const path = require('path');

// Files that need import fixes based on the error messages
const filesToFix = [
  'frontend/src/pages/Checkout.js',
  'frontend/src/pages/NFTDetail.js', 
  'frontend/src/pages/ProductDetail.js',
  'frontend/src/pages/SecurityAuditTrail.js',
  'frontend/src/pages/ShoppingCart.js'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix the specific import pattern: "import { \nimport" 
      content = content.replace(/import\s*\{\s*\n\s*import\s*\{/g, 'import {');
      content = content.replace(/import\s*\{\s*\r?\n\s*import\s*\{/g, 'import {');
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed imports in ${filePath}`);
    } catch (error) {
      console.log(`❌ Error fixing ${filePath}: ${error.message}`);
    }
  } else {
    console.log(`❌ File not found: ${filePath}`);
  }
});

console.log('🎯 Frontend import fixes completed!'); 