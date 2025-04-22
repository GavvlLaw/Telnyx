require('dotenv').config();
const telnyx = require('telnyx');

// Initialize Telnyx client with API key
const telnyxClient = telnyx(process.env.TELNYX_API_KEY);

// ANSI color codes for better output formatting
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Helper function to log results
function logResult(operation, result) {
  console.log(`${colors.green}[${operation}] Success:${colors.reset}`);
  console.log(JSON.stringify(result, null, 2));
  console.log('\n');
}

// Helper function to log errors
function logError(operation, error) {
  console.error(`${colors.red}[${operation}] Error:${colors.reset}`);
  console.error(error.message);
  console.error('\n');
}

// Search for available phone numbers
async function searchPhoneNumbers(options = {}) {
  try {
    const defaultOptions = {
      country_code: 'US',
      limit: 10,
      features: ['sms', 'voice'],
      ...options
    };

    const result = await telnyxClient.availablePhoneNumbers.list(defaultOptions);
    return result.data;
  } catch (error) {
    console.error('Error searching for phone numbers:', error);
    throw new Error(`Failed to search phone numbers: ${error.message}`);
  }
}

// List phone numbers in the account
async function listPhoneNumbers(options = {}) {
  try {
    const defaultOptions = {
      page: 1,
      pageSize: 25,
      status: 'active',
      ...options
    };

    const result = await telnyxClient.phoneNumbers.list({
      page: {
        number: defaultOptions.page,
        size: defaultOptions.pageSize
      },
      filter: {
        status: defaultOptions.status
      }
    });
    
    return result.data;
  } catch (error) {
    console.error('Error listing phone numbers:', error);
    throw new Error(`Failed to list phone numbers: ${error.message}`);
  }
}

// Get details for a specific phone number
async function getPhoneNumberDetails(phoneId) {
  try {
    const result = await telnyxClient.phoneNumbers.retrieve(phoneId);
    return result.data;
  } catch (error) {
    console.error(`Error retrieving phone number ${phoneId}:`, error);
    throw new Error(`Failed to get phone number details: ${error.message}`);
  }
}

// Test searching for available phone numbers
async function testSearchPhoneNumbers() {
  try {
    console.log(`${colors.blue}Searching for available phone numbers...${colors.reset}`);
    
    const options = {
      country_code: 'US',
      limit: 5
    };
    
    const phoneNumbers = await searchPhoneNumbers(options);
    logResult('Search Phone Numbers', phoneNumbers);
    
    // Return the first phone number for use in other tests
    return phoneNumbers.length > 0 ? phoneNumbers[0].phone_number : null;
  } catch (error) {
    logError('Search Phone Numbers', error);
    return null;
  }
}

// Test listing phone numbers in the account
async function testListPhoneNumbers() {
  try {
    console.log(`${colors.blue}Listing phone numbers in account...${colors.reset}`);
    
    const phoneNumbers = await listPhoneNumbers();
    logResult('List Phone Numbers', phoneNumbers);
    
    // Return the first phone number ID if available
    return phoneNumbers.length > 0 ? phoneNumbers[0].id : null;
  } catch (error) {
    logError('List Phone Numbers', error);
    return null;
  }
}

// Test getting phone number details
async function testGetPhoneNumberDetails(phoneId) {
  if (!phoneId) {
    console.log(`${colors.yellow}Skipping phone number details test - no phone ID available${colors.reset}`);
    return;
  }
  
  try {
    console.log(`${colors.blue}Getting phone number details for ID: ${phoneId}...${colors.reset}`);
    
    const phoneDetails = await getPhoneNumberDetails(phoneId);
    logResult('Get Phone Number Details', phoneDetails);
  } catch (error) {
    logError('Get Phone Number Details', error);
  }
}

// Main test function
async function runTests() {
  console.log(`${colors.magenta}Starting Telnyx API Integration Tests${colors.reset}`);
  console.log(`${colors.cyan}API Key: ${process.env.TELNYX_API_KEY ? '✓ Set' : '✗ Not Set'}${colors.reset}`);
  console.log(`${colors.cyan}Connection ID: ${process.env.TELNYX_SIP_CONNECTION_ID ? '✓ Set' : '✗ Not Set'}${colors.reset}`);
  console.log(`${colors.cyan}Messaging Profile ID: ${process.env.TELNYX_MESSAGING_PROFILE_ID ? '✓ Set' : '✗ Not Set'}${colors.reset}`);
  console.log('\n');
  
  // Check if required environment variables are set
  if (!process.env.TELNYX_API_KEY) {
    console.error(`${colors.red}Error: TELNYX_API_KEY environment variable not set${colors.reset}`);
    process.exit(1);
  }
  
  // Run read-only tests that don't require additional dependencies
  
  // Search for available phone numbers (safe, read-only)
  const availableNumber = await testSearchPhoneNumbers();
  
  // List phone numbers in the account (safe, read-only)
  const existingPhoneId = await testListPhoneNumbers();
  
  // Get phone number details (safe, read-only)
  await testGetPhoneNumberDetails(existingPhoneId);
  
  console.log(`${colors.magenta}All tests completed${colors.reset}`);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
}); 