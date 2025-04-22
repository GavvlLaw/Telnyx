require('dotenv').config();
const https = require('https');

// Get API key from environment
const apiKey = process.env.TELNYX_API_KEY;

if (!apiKey) {
  console.error('Error: TELNYX_API_KEY environment variable is not set');
  process.exit(1);
}

// Test different authentication methods
async function testAuth() {
  console.log(`Testing Telnyx API authentication with key starting with: ${apiKey.substring(0, 4)}...`);
  console.log(`API key length: ${apiKey.length}`);
  console.log(`API key format correct (starts with "KEY"): ${apiKey.startsWith('KEY')}`);
  console.log('---------------------------------------------------');

  // Methods to try
  const authMethods = [
    {
      name: "Method 1: Bearer token",
      headers: { 'Authorization': `Bearer ${apiKey}` }
    },
    {
      name: "Method 2: Direct API key",
      headers: { 'x-api-key': apiKey }
    },
    {
      name: "Method 3: API key as username",
      auth: `${apiKey}:`
    }
  ];

  for (const method of authMethods) {
    console.log(`\nTrying ${method.name}...`);
    
    // Options for the API request
    const options = {
      hostname: 'api.telnyx.com',
      port: 443,
      path: '/v2/available_phone_numbers',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(method.headers || {})
      }
    };
    
    if (method.auth) {
      options.auth = method.auth;
    }
    
    try {
      const result = await makeRequest(options);
      console.log(`Status: ${result.statusCode} ${result.statusMessage}`);
      
      if (result.statusCode === 200) {
        console.log('✅ SUCCESS! This authentication method works.');
        try {
          const data = JSON.parse(result.data);
          console.log(`Found ${data.data.length} phone numbers.`);
        } catch (e) {
          console.log('Error parsing response:', e.message);
        }
      } else {
        console.log('❌ FAILED with this authentication method.');
        try {
          const error = JSON.parse(result.data);
          console.log('Error details:', JSON.stringify(error.errors[0], null, 2));
        } catch (e) {
          console.log('Raw response:', result.data);
        }
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n---------------------------------------------------');
  console.log('Testing complete. If all methods failed, consider:');
  console.log('1. Generate a new API key in the Telnyx Portal');
  console.log('2. Ensure your account is active and in good standing');
  console.log('3. Update your .env file with the new key using: node update-telnyx-key.js');
}

// Helper function to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Run the tests
testAuth().catch(error => {
  console.error('Unhandled error:', error.message);
}); 