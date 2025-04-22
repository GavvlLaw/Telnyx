require('dotenv').config();
const telnyxService = require('./src/services/telnyxService');

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

// Test searching for available phone numbers
async function testSearchPhoneNumbers() {
  try {
    console.log(`${colors.blue}Searching for available phone numbers...${colors.reset}`);
    
    const options = {
      country_code: 'US',
      limit: 5
    };
    
    const phoneNumbers = await telnyxService.searchPhoneNumbers(options);
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
    
    const phoneNumbers = await telnyxService.listPhoneNumbers();
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
    
    const phoneDetails = await telnyxService.getPhoneNumberDetails(phoneId);
    logResult('Get Phone Number Details', phoneDetails);
  } catch (error) {
    logError('Get Phone Number Details', error);
  }
}

// Test purchasing a phone number (CAUTION: This will actually purchase a number)
async function testPurchasePhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    console.log(`${colors.yellow}Skipping purchase test - no phone number available${colors.reset}`);
    return null;
  }
  
  console.log(`${colors.yellow}WARNING: This will purchase the phone number ${phoneNumber}.${colors.reset}`);
  console.log(`${colors.yellow}Press Ctrl+C within 5 seconds to cancel...${colors.reset}`);
  
  // Wait 5 seconds to allow cancellation
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    console.log(`${colors.blue}Purchasing phone number: ${phoneNumber}...${colors.reset}`);
    
    const purchasedNumber = await telnyxService.purchasePhoneNumber(phoneNumber);
    logResult('Purchase Phone Number', purchasedNumber);
    
    return purchasedNumber.id;
  } catch (error) {
    logError('Purchase Phone Number', error);
    return null;
  }
}

// Test sending an SMS
async function testSendSMS(from) {
  if (!from) {
    console.log(`${colors.yellow}Skipping SMS test - no phone number available${colors.reset}`);
    return;
  }
  
  // To number should be a phone that can receive test messages
  const to = process.env.TEST_PHONE_NUMBER;
  
  if (!to) {
    console.log(`${colors.yellow}Skipping SMS test - TEST_PHONE_NUMBER environment variable not set${colors.reset}`);
    return;
  }
  
  try {
    console.log(`${colors.blue}Sending test SMS from ${from} to ${to}...${colors.reset}`);
    
    const text = 'This is a test message from the Telnyx API integration!';
    const message = await telnyxService.sendSMS(from, to, text);
    
    logResult('Send SMS', message);
  } catch (error) {
    logError('Send SMS', error);
  }
}

// Test releasing a phone number (CAUTION: This will actually release the number)
async function testReleasePhoneNumber(phoneId) {
  if (!phoneId) {
    console.log(`${colors.yellow}Skipping release test - no phone ID available${colors.reset}`);
    return;
  }
  
  console.log(`${colors.yellow}WARNING: This will release the phone number with ID ${phoneId}.${colors.reset}`);
  console.log(`${colors.yellow}Press Ctrl+C within 5 seconds to cancel...${colors.reset}`);
  
  // Wait 5 seconds to allow cancellation
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    console.log(`${colors.blue}Releasing phone number with ID: ${phoneId}...${colors.reset}`);
    
    const result = await telnyxService.releasePhoneNumber(phoneId);
    logResult('Release Phone Number', result);
  } catch (error) {
    logError('Release Phone Number', error);
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
  
  // Choose which tests to run by commenting out the ones you don't want to run
  
  // Search for available phone numbers (safe, read-only)
  const availableNumber = await testSearchPhoneNumbers();
  
  // List phone numbers in the account (safe, read-only)
  const existingPhoneId = await testListPhoneNumbers();
  
  // Get phone number details (safe, read-only)
  await testGetPhoneNumberDetails(existingPhoneId);
  
  // Purchase a phone number (CAUTION: costs money)
  // Uncomment the next line to test purchasing a number
  // const purchasedPhoneId = await testPurchasePhoneNumber(availableNumber);
  
  // Send an SMS (costs money)
  // Uncomment the next line to test sending an SMS
  // await testSendSMS('+1XXXXXXXXXX'); // Replace with a phone number from your account
  
  // Release a phone number (CAUTION: releases the number)
  // Uncomment the next line to test releasing a number
  // await testReleasePhoneNumber(purchasedPhoneId);
  
  console.log(`${colors.magenta}All tests completed${colors.reset}`);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
}); 