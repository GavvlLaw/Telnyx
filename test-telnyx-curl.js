require('dotenv').config();
const https = require('https');

// Get API key from environment
const apiKey = process.env.TELNYX_API_KEY;

if (!apiKey) {
  console.error('Error: TELNYX_API_KEY environment variable is not set');
  process.exit(1);
}

console.log(`Testing Telnyx API with key starting with: ${apiKey.substring(0, 4)}...`);

// Options for the API request
const options = {
  hostname: 'api.telnyx.com',
  port: 443,
  path: '/v2/available_phone_numbers',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Make the request
const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  
  // A chunk of data has been received
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // The whole response has been received
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('\nAPI connection successful!');
      console.log('\nFirst few phone numbers:');
      try {
        const parsedData = JSON.parse(data);
        const phoneNumbers = parsedData.data.slice(0, 3);
        console.log(JSON.stringify(phoneNumbers, null, 2));
      } catch (e) {
        console.log('Error parsing response:', e.message);
      }
    } else {
      console.log('\nAPI connection failed');
      try {
        const parsedData = JSON.parse(data);
        console.log('Error Response:', JSON.stringify(parsedData, null, 2));
      } catch (e) {
        console.log('Response:', data);
      }
      
      // Provide guidance based on status code
      if (res.statusCode === 401) {
        console.log('\nAuthentication Error (401)');
        console.log('Possible causes:');
        console.log('1. Your API key may be expired or invalid');
        console.log('2. Your API key may be formatted incorrectly');
        console.log('3. Your account may be inactive');
        console.log('\nSuggested actions:');
        console.log('1. Log in to Telnyx Portal and generate a new API key');
        console.log('2. Make sure you\'re using the full API key, including the "KEY" prefix');
        console.log('3. Update your .env file with the new key using: node update-telnyx-key.js');
      }
    }
  });
});

// Handle errors
req.on('error', (error) => {
  console.error('Error making API request:', error.message);
});

// End the request
req.end(); 