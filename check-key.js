// Load environment variables
require('dotenv').config();

// Get and check API key
const apiKey = process.env.TELNYX_API_KEY;

console.log('===== Telnyx API Key Check =====');

if (!apiKey) {
  console.log('❌ ERROR: TELNYX_API_KEY environment variable is not set');
  process.exit(1);
}

// Check key format
console.log(`Key starts with: ${apiKey.substring(0, 10)}...`);
console.log(`Key length: ${apiKey.length} characters`);
console.log(`Starts with "KEY": ${apiKey.startsWith('KEY')}`);

// Check for common issues
if (!apiKey.startsWith('KEY')) {
  console.log('\n❌ ISSUE: API key should start with "KEY"');
} else if (apiKey.length < 20) {
  console.log('\n❌ ISSUE: API key seems too short');
} else if (apiKey.includes(' ')) {
  console.log('\n❌ ISSUE: API key contains spaces');
} else {
  console.log('\n✅ KEY FORMAT: Appears to be correct');
}

// Show full key (for diagnostic purposes)
console.log('\nFull key for reference:');
console.log(apiKey);

// Provide instructions
console.log('\n===== Next Steps =====');
console.log('1. If the key format looks incorrect, get a new key from:');
console.log('   https://portal.telnyx.com/#/app/api-keys');
console.log('2. Update your .env file with: node update-telnyx-key.js');
console.log('3. Test the API with: node test-telnyx-special.js'); 