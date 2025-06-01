const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blocmerce API',
      version: '2.0.0',
      description: 'Comprehensive NFT marketplace and e-commerce platform API',
      contact: {
        name: 'Blocmerce Team',
        email: 'support@blocmerce.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.blocmerce.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            username: {
              type: 'string',
              description: 'Unique username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            userType: {
              type: 'string',
              enum: ['buyer', 'seller'],
              description: 'Type of user account'
            },
            wallet_address: {
              type: 'string',
              description: 'Crypto wallet address'
            },
            isVerified: {
              type: 'boolean',
              description: 'Whether user is verified'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Product ID'
            },
            name: {
              type: 'string',
              description: 'Product name'
            },
            description: {
              type: 'string',
              description: 'Product description'
            },
            price: {
              type: 'number',
              description: 'Product price'
            },
            category: {
              type: 'string',
              description: 'Product category'
            },
            seller: {
              type: 'string',
              description: 'Seller ID'
            },
            isNFT: {
              type: 'boolean',
              description: 'Whether product is an NFT'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'sold'],
              description: 'Product status'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Product creation date'
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Order ID'
            },
            buyer: {
              type: 'string',
              description: 'Buyer ID'
            },
            seller: {
              type: 'string',
              description: 'Seller ID'
            },
            product: {
              type: 'string',
              description: 'Product ID'
            },
            amount: {
              type: 'number',
              description: 'Order amount'
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
              description: 'Order status'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Order creation date'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Detailed error information'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './backend/routes/*.js',
    './server.js'
  ]
};

const specs = swaggerJsdoc(options);

const swaggerSetup = (app) => {
  // Swagger page
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #667eea }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; }
    `,
    customSiteTitle: 'Blocmerce API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }));

  // Swagger JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

};

module.exports = swaggerSetup; 