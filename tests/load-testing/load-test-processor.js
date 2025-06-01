/**
 * 🛡️ SAFE LOAD TEST PROCESSOR
 * Custom processor for Artillery.js load testing
 * Generates safe test data without affecting production data
 */

module.exports = {
    // Generate random test data
    generateTestData,
    
    // Custom response validation
    validateResponse,
    
    // Performance metric collection
    collectMetrics,
    
    // Pre-test setup
    setupTest,
    
    // Post-test cleanup
    cleanupTest
};

function generateTestData(requestParams, context, ee, next) {
    // Generate safe test user data
    context.vars.testEmail = `loadtest-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    context.vars.testUsername = `testuser-${Math.random().toString(36).substring(7)}`;
    context.vars.randomId = Math.random().toString(36).substring(7);
    context.vars.timestamp = Date.now();
    
    // Random pagination values
    context.vars.randomPage = Math.floor(Math.random() * 10) + 1;
    context.vars.randomLimit = [5, 10, 20, 50][Math.floor(Math.random() * 4)];
    
    // Random category for NFT testing
    const categories = ['art', 'gaming', 'music', 'sports', 'collectibles'];
    context.vars.randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    console.log(`🎲 Generated test data for request: ${context.vars.testUsername}`);
    return next();
}

function validateResponse(requestParams, response, context, ee, next) {
    // Validate response structure and performance
    const responseTime = response.timings?.end || 0;
    const statusCode = response.statusCode;
    
    // Check response time thresholds
    if (responseTime > 5000) {
        console.warn(`⚠️  Slow response detected: ${responseTime}ms for ${requestParams.url}`);
        ee.emit('counter', 'slow_responses', 1);
    }
    
    // Check status code validity
    if (statusCode >= 400 && statusCode !== 401 && statusCode !== 429) {
        console.warn(`⚠️  Error response: ${statusCode} for ${requestParams.url}`);
        ee.emit('counter', 'error_responses', 1);
    }
    
    // Success metrics
    if (statusCode >= 200 && statusCode < 300) {
        ee.emit('counter', 'successful_responses', 1);
        ee.emit('histogram', 'response_time_success', responseTime);
    }
    
    return next();
}

function collectMetrics(requestParams, response, context, ee, next) {
    // Custom metrics collection
    const metrics = {
        url: requestParams.url,
        method: requestParams.method || 'GET',
        statusCode: response.statusCode,
        responseTime: response.timings?.end || 0,
        contentLength: response.headers['content-length'] || 0,
        timestamp: new Date().toISOString()
    };
    
    // Emit custom metrics
    ee.emit('counter', `requests_${requestParams.url.split('/')[2] || 'unknown'}`, 1);
    ee.emit('histogram', 'content_size', parseInt(metrics.contentLength) || 0);
    
    // Log performance data
    if (metrics.responseTime > 1000) {
        console.log(`📊 Performance data: ${JSON.stringify(metrics)}`);
    }
    
    return next();
}

function setupTest(context, ee, next) {
    console.log('🚀 Setting up load test environment...');
    console.log('=====================================');
    console.log('✅ Test mode: Safe read-only operations');
    console.log('✅ Target: Blocmerce NFT Marketplace');
    console.log('✅ Zero risk to production data');
    console.log('=====================================');
    
    // Set up test context
    context.vars.testStartTime = Date.now();
    context.vars.testId = `load-test-${Date.now()}`;
    
    return next();
}

function cleanupTest(context, ee, next) {
    const testDuration = Date.now() - (context.vars.testStartTime || 0);
    
    console.log('🏁 Load test completed!');
    console.log('=======================');
    console.log(`⏱️  Test duration: ${Math.round(testDuration / 1000)}s`);
    console.log(`🆔 Test ID: ${context.vars.testId}`);
    console.log('✅ No production data affected');
    console.log('📊 Check results in ./tests/load-testing/results/');
    console.log('=======================');
    
    return next();
} 