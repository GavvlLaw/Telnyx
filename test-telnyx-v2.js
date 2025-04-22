require('dotenv').config();
const https = require('https');

// Get API key from environment with cleanup
const apiKey = process.env.TELNYX_API_KEY.trim();

if (!apiKey) {
  console.error('Error: TELNYX_API_KEY environment variable is not set');
  process.exit(1);
}

console.log(`Testing Telnyx API with key: ${apiKey.substring(0, 10)}...`);
console.log(`Key length: ${apiKey.length} characters`);

// Determine if this is a V2 key (contains an underscore separator)
const isV2Key = apiKey.includes('_');
console.log(`Detected V2 API key format: ${isV2Key ? 'YES' : 'NO'}`);

// If it's a V2 key, split it into id and secret for proper authentication
let authHeader;
if (isV2Key) {
  // For V2 keys, we use Basic authentication with the key ID as username and secret as password
  const [keyId, keySecret] = apiKey.split('_');
  // Create a base64 encoded Basic auth header: base64(keyId:keySecret)
  const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  authHeader = `Basic ${authString}`;
  console.log('Using Basic authentication for V2 API key');
} else {
  // For V1 keys, we use Bearer token authentication
  authHeader = `Bearer ${apiKey}`;
  console.log('Using Bearer authentication for V1 API key');
}

// Options for the API request
const options = {
  hostname: 'api.telnyx.com',
  port: 443,
  path: '/v2/available_phone_numbers',
  method: 'GET',
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

console.log('Sending request to Telnyx API...');

// Make the request
const req = https.request(options, (res) => {
  console.log(`\nResponse received: ${res.statusCode} ${res.statusMessage}`);
  
  let data = '';
  
  // A chunk of data has been received
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // The whole response has been received
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('\nSUCCESS! API connection established correctly.');
      try {
        const parsedData = JSON.parse(data);
        console.log(`Found ${parsedData.data.length} available phone numbers.`);
        if (parsedData.data.length > 0) {
          console.log('\nExample numbers:');
          parsedData.data.slice(0, 3).forEach(phone => {
            console.log(`- ${phone.phone_number} (${phone.region_information.administrative_area})`);
          });
        }
      } catch (e) {
        console.log('Error parsing response:', e.message);
      }
    } else {
      console.log('\nERROR: API connection failed.');
      try {
        const parsedData = JSON.parse(data);
        const error = parsedData.errors[0];
        console.log(`Error code: ${error.code}`);
        console.log(`Error title: ${error.title}`);
        console.log(`Error detail: ${error.detail}`);
      } catch (e) {
        console.log('Raw response:', data);
      }
      
      console.log('\nTROUBLESHOOTING SUGGESTIONS:');
      if (isV2Key) {
        console.log('1. Your V2 API key might be incorrect or expired');
        console.log('2. Make sure you\'re using the correct V2 API key format: KEY_SECRET');
      } else {
        console.log('1. Your API key might need to be updated to V2 format');
      }
      console.log('3. Login to Telnyx Portal: https://portal.telnyx.com');
      console.log('4. Go to Auth > API Keys section and create a new V2 API key');
      console.log('5. Update your .env file with the new key');
    }
  });
});

// Handle connection errors
req.on('error', (error) => {
  console.error('\nERROR connecting to Telnyx API:', error.message);
  console.log('Check your internet connection and try again.');
});

// End the request
req.end(); 