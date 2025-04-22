const fs = require('fs');

// Read the .env file
const envContent = fs.readFileSync('.env', 'utf8');

// Format the content for display
console.log('=============== CURRENT .ENV FILE CONTENTS ===============');
console.log(envContent);
console.log('==========================================================');

// Check for common issues with the variables
const lines = envContent.split('\n');
const variables = {};

lines.forEach(line => {
  // Skip comments and empty lines
  if (line.trim() === '' || line.trim().startsWith('#')) {
    return;
  }
  
  // Extract key and value
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    variables[key] = value;
  }
});

// Check specific variables
console.log('\n=============== VALIDATION RESULTS ===============');

// Check Telnyx API key format
if (variables.TELNYX_API_KEY && variables.TELNYX_API_KEY.startsWith('KEY')) {
  console.log('✅ TELNYX_API_KEY: Valid format');
} else {
  console.log('❌ TELNYX_API_KEY: Invalid format, should start with "KEY"');
}

// Check SIP Connection ID format (should be numeric)
if (variables.TELNYX_SIP_CONNECTION_ID && !isNaN(variables.TELNYX_SIP_CONNECTION_ID)) {
  console.log('✅ TELNYX_SIP_CONNECTION_ID: Valid format');
} else {
  console.log('❌ TELNYX_SIP_CONNECTION_ID: Invalid format, should be numeric');
}

// Check TeXML Application ID format (should be numeric)
if (variables.TELNYX_TEXML_APP_ID && !isNaN(variables.TELNYX_TEXML_APP_ID)) {
  console.log('✅ TELNYX_TEXML_APP_ID: Valid format');
} else {
  console.log('❌ TELNYX_TEXML_APP_ID: Invalid format, should be numeric');
}

// Check Messaging Profile ID format (should be UUID)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (variables.TELNYX_MESSAGING_PROFILE_ID && uuidRegex.test(variables.TELNYX_MESSAGING_PROFILE_ID)) {
  console.log('✅ TELNYX_MESSAGING_PROFILE_ID: Valid UUID format');
} else {
  console.log('❌ TELNYX_MESSAGING_PROFILE_ID: Invalid format, should be UUID');
}

// Check webhook URL format
if (variables.WEBHOOK_URL && variables.WEBHOOK_URL.startsWith('https://')) {
  console.log('✅ WEBHOOK_URL: Valid HTTPS URL');
} else {
  console.log('❌ WEBHOOK_URL: Invalid format, should start with https://');
}

// Check API key
if (variables.API_KEY && variables.API_KEY.length > 10) {
  console.log('✅ API_KEY: Sufficient length');
} else {
  console.log('❌ API_KEY: Too short or missing');
}

console.log('=================================================='); 