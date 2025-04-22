require('dotenv').config();
const telnyx = require('telnyx');

// Get API key from environment
const apiKey = process.env.TELNYX_API_KEY.trim();

// Initialize Telnyx client with proper API key handling
let telnyxClient;

// Check if we have a V2 API key
if (apiKey.includes('_')) {
  console.log('Detected V2 API key format');
  const [keyId, keySecret] = apiKey.split('_');
  console.log(`Using key ID: ${keyId.substring(0, 10)}... with secret`);
  
  telnyxClient = telnyx({
    apiKey: keyId,
    apiSecret: keySecret
  });
} else {
  console.log('Using standard API key format');
  telnyxClient = telnyx(apiKey);
}

// Function to search for available phone numbers
async function searchPhoneNumbers() {
  try {
    console.log('Searching for available phone numbers...');
    
    const result = await telnyxClient.availablePhoneNumbers.list({
      country_code: 'US',
      limit: 5
    });
    
    console.log(`SUCCESS! Found ${result.data.length} available phone numbers`);
    
    if (result.data.length > 0) {
      console.log('\nExample numbers:');
      result.data.forEach((number, index) => {
        console.log(`${index + 1}. ${number.phone_number} (${number.region_information.administrative_area || 'Unknown region'})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('ERROR searching for phone numbers:');
    console.error(`Status: ${error.statusCode || 'Unknown'}`);
    console.error(`Type: ${error.type || 'Unknown'}`);
    console.error(`Message: ${error.message || 'No error message'}`);
    
    if (error.raw && error.raw.errors && error.raw.errors.length > 0) {
      const apiError = error.raw.errors[0];
      console.error(`\nAPI Error Code: ${apiError.code}`);
      console.error(`API Error Title: ${apiError.title}`);
      console.error(`API Error Detail: ${apiError.detail}`);
    }
    
    return false;
  }
}

// Run the test
searchPhoneNumbers()
  .then(success => {
    if (success) {
      console.log('\nYour Telnyx API key is working correctly!');
    } else {
      console.log('\nThere was a problem with your Telnyx API key.');
      console.log('If you\'re using a V2 API key (with underscore), make sure you have the entire key including the secret portion.');
      console.log('You can get a new API key from: https://portal.telnyx.com/#/app/api-keys');
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  }); 