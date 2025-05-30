const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'YourApp',
    audience: process.env.JWT_AUDIENCE || 'YourApp-Users'
  },

  // Password Configuration
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },

  // Rate Limiting
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: 'Too many authentication attempts, please try again later.'
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 attempts per window
      message: 'Too many password reset attempts, please try again later.'
    },
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // 100 requests per window
    }
  },

  // Account Security
  account: {
    maxLoginAttempts: 5,
    lockoutDuration: 60 * 60 * 1000, // 1 hour in milliseconds
    passwordResetExpiry: 60 * 60 * 1000, // 1 hour
    emailVerificationExpiry: 24 * 60 * 60 * 1000, // 24 hours
    maxPasswordResetAttempts: 3
  },

  // Two-Factor Authentication
  twoFA: {
    issuer: process.env.TWO_FA_ISSUER || 'YourApp',
    windowTime: 2, // Allow 60 seconds clock drift
    backupCodesCount: 10,
    backupCodeLength: 8
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'noreply@yourapp.com',
        pass: process.env.SMTP_PASS || 'password'
      }
    },
    from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
    templates: {
      passwordReset: {
        subject: 'Password Reset Request',
        expiry: '1 hour'
      },
      emailVerification: {
        subject: 'Verify Your Email Address',
        expiry: '24 hours'
      },
      loginNotification: {
        subject: 'New Login to Your Account'
      },
      twoFactorSetup: {
        subject: 'Two-Factor Authentication Setup'
      }
    }
  },

  // Session Configuration
  session: {
    defaultTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days
    rememberMeTimeout: 30 * 24 * 60 * 60 * 1000 // 30 days
  },

  // Security Headers
  headers: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }
  },

  // CORS Configuration
  cors: {
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },

  // Frontend URLs
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    passwordResetPath: '/reset-password',
    emailVerificationPath: '/verify-email',
    loginPath: '/login',
    dashboardPath: '/dashboard',
    securityPath: '/security'
  }
};

module.exports = securityConfig; 