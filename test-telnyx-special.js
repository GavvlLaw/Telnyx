require('dotenv').config();
const https = require('https');

// Get API key from environment with cleanup
const apiKey = process.env.TELNYX_API_KEY.trim();

if (!apiKey) {
  console.error('Error: TELNYX_API_KEY environment variable is not set');
  process.exit(1);
}

console.log(`Testing Telnyx API with key ID: ${apiKey.substring(0, 10)}...`);
console.log(`Complete key length: ${apiKey.length} characters`);
console.log('Sending request to Telnyx API...');

// Options for the API request - using the recommended authentication for Telnyx V2 API
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
        
        // Log the full key ID if there's a specific key-related error
        if (error.detail && error.detail.includes('No key found matching the ID')) {
          console.log(`\nYOUR KEY ID: ${apiKey}`);
          console.log('\nThis specific key ID is NOT found in the Telnyx system.');
          console.log('You need to generate a new API key from the Telnyx Portal.');
        }
      } catch (e) {
        console.log('Raw response:', data);
      }
      
      if (res.statusCode === 401) {
        console.log('\nTROUBLESHOOTING API KEY ISSUE:');
        console.log('1. Your API key appears to be invalid or expired');
        console.log('2. Login to Telnyx Portal: https://portal.telnyx.com');
        console.log('3. Go to Auth > API Keys section');
        console.log('4. Create a new API key');
        console.log('5. Update your .env file with the new key');
        console.log('   (You can use: node update-telnyx-key.js)');
      }
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