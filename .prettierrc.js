module.exports = {
  // Basic Formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  doubleQuote: false,
  quoteProps: 'as-needed',
  
  // Indentation
  tabWidth: 2,
  useTabs: false,
  
  // Line Length
  printWidth: 120,
  proseWrap: 'preserve',
  
  // Spacing
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  
  // Line Endings
  endOfLine: 'lf',
  
  // Language Specific
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
        printWidth: 80
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: ['*.js', '*.jsx'],
      options: {
        semi: true,
        singleQuote: true
      }
    }
  ]
}; 