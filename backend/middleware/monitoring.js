const os = require('os');
const process = require('process');

// In-memory storage for metrics (in production, use Redis or database)
let metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    byEndpoint: {},
    byMethod: {},
    responseTimes: []
  },
  errors: {
    total: 0,
    recent: [],
    byType: {}
  },
  system: {
    startTime: Date.now(),
    lastCheck: Date.now()
  }
};

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;

  // Track request
  metrics.requests.total++;
  
  if (!metrics.requests.byEndpoint[endpoint]) {
    metrics.requests.byEndpoint[endpoint] = {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      errors: 0
    };
  }
  
  if (!metrics.requests.byMethod[req.method]) {
    metrics.requests.byMethod[req.method] = 0;
  }
  
  metrics.requests.byEndpoint[endpoint].count++;
  metrics.requests.byMethod[req.method]++;

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Track response time
    metrics.requests.responseTimes.push(responseTime);
    if (metrics.requests.responseTimes.length > 1000) {
      metrics.requests.responseTimes = metrics.requests.responseTimes.slice(-1000);
    }
    
    // Update endpoint metrics
    metrics.requests.byEndpoint[endpoint].totalTime += responseTime;
    metrics.requests.byEndpoint[endpoint].avgTime = 
      metrics.requests.byEndpoint[endpoint].totalTime / 
      metrics.requests.byEndpoint[endpoint].count;

    // Track success/failure
    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
      metrics.requests.byEndpoint[endpoint].errors++;
    }

    originalEnd.apply(this, args);
  };

  next();
};

// Error tracking middleware
const errorTrackingMiddleware = (error, req, res, next) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    endpoint: `${req.method} ${req.path}`,
    type: error.name || 'UnknownError',
    statusCode: error.statusCode || 500
  };

  // Track error
  metrics.errors.total++;
  metrics.errors.recent.unshift(errorInfo);
  
  // Keep only last 100 errors
  if (metrics.errors.recent.length > 100) {
    metrics.errors.recent = metrics.errors.recent.slice(0, 100);
  }

  // Track by type
  if (!metrics.errors.byType[errorInfo.type]) {
    metrics.errors.byType[errorInfo.type] = 0;
  }
  metrics.errors.byType[errorInfo.type]++;

  next(error);
};

// Monitor object with utility methods
const monitor = {
  getMetrics() {
    const now = Date.now();
    const uptime = now - metrics.system.startTime;
    
    // Calculate average response time
    const avgResponseTime = metrics.requests.responseTimes.length > 0 
      ? metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / metrics.requests.responseTimes.length
      : 0;

    // Calculate success rate
    const successRate = metrics.requests.total > 0 
      ? (metrics.requests.successful / metrics.requests.total) * 100
      : 100;

    // Calculate requests per minute
    const requestsPerMinute = metrics.requests.total > 0 
      ? (metrics.requests.total / (uptime / 60000))
      : 0;

    // System metrics
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      timestamp: now,
      uptime: uptime,
      summary: {
        totalRequests: metrics.requests.total,
        successfulRequests: metrics.requests.successful,
        failedRequests: metrics.requests.failed,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
        totalErrors: metrics.errors.total
      },
      system: {
        memory: {
          used: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
          total: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
          percentage: Math.round((usedMem / totalMem) * 10000) / 100,
          system: {
            total: Math.round((totalMem / 1024 / 1024) * 100) / 100,
            free: Math.round((freeMem / 1024 / 1024) * 100) / 100,
            used: Math.round((usedMem / 1024 / 1024) * 100) / 100
          }
        },
        cpu: {
          usage: process.cpuUsage(),
          loadAvg: os.loadavg()
        },
        platform: os.platform(),
        nodeVersion: process.version
      },
      endpoints: metrics.requests.byEndpoint,
      methods: metrics.requests.byMethod,
      errors: {
        total: metrics.errors.total,
        recent: metrics.errors.recent.slice(0, 10),
        byType: metrics.errors.byType
      },
      performance: {
        responseTimes: {
          avg: Math.round(avgResponseTime),
          min: metrics.requests.responseTimes.length > 0 ? Math.min(...metrics.requests.responseTimes) : 0,
          max: metrics.requests.responseTimes.length > 0 ? Math.max(...metrics.requests.responseTimes) : 0,
          recent: metrics.requests.responseTimes.slice(-10)
        }
      }
    };
  },

  getHealthStatus() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memPercentage = ((totalMem - freeMem) / totalMem) * 100;
    
    const avgResponseTime = metrics.requests.responseTimes.length > 0 
      ? metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / metrics.requests.responseTimes.length
      : 0;

    const successRate = metrics.requests.total > 0 
      ? (metrics.requests.successful / metrics.requests.total) * 100
      : 100;

    let status = 'healthy';
    let issues = [];

    if (memPercentage > 90) {
      status = 'critical';
      issues.push('High memory usage');
    } else if (memPercentage > 80) {
      status = 'warning';
      issues.push('Elevated memory usage');
    }

    if (avgResponseTime > 2000) {
      status = status === 'healthy' ? 'warning' : 'critical';
      issues.push('High response times');
    }

    if (successRate < 95) {
      status = status === 'healthy' ? 'warning' : 'critical';
      issues.push('Low success rate');
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - metrics.system.startTime,
      issues,
      metrics: {
        memoryUsage: Math.round(memPercentage * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate * 100) / 100,
        totalRequests: metrics.requests.total,
        totalErrors: metrics.errors.total
      }
    };
  },

  reset() {
    metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: {},
        byMethod: {},
        responseTimes: []
      },
      errors: {
        total: 0,
        recent: [],
        byType: {}
      },
      system: {
        startTime: Date.now(),
        lastCheck: Date.now()
      }
    };
  }
};

module.exports = {
  performanceMiddleware,
  errorTrackingMiddleware,
  monitor
}; 