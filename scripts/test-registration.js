const axios = require('axios');

async function testRegistration() {
    const timestamp = Date.now().toString().slice(-6); // Use last 6 digits
    const testUser = {
        firstName: 'Test',
        lastName: 'User',
        username: `test${timestamp}`, // Shorter username
        email: `test${timestamp}@example.com`,
        password: 'TestPassword123!',
        userType: 'buyer'
    };

    console.log('🧪 Testing user registration...');
    console.log('Test user data:', JSON.stringify(testUser, null, 2));

    try {
        const response = await axios.post('http://localhost:5000/api/auth/register', testUser, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        console.log('✅ Registration successful!');
        console.log('Status:', response.status);
        console.log('Response:', response.data);
        
    } catch (error) {
        console.log('❌ Registration failed!');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data);
        console.log('Message:', error.message);
        
        if (error.response?.data?.details) {
            console.log('Validation Details:', error.response.data.details);
        }
    }
}

testRegistration(); 