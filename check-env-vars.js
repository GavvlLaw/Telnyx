require('dotenv').config();

console.log('Checking environment variables...');

const requiredVars = [
  'TELNYX_API_KEY',
  'TELNYX_SIP_CONNECTION_ID',
  'TELNYX_MESSAGING_PROFILE_ID'
];

const missingVars = [];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  } else {
    // Show first few characters of the value to confirm it's set (but hide most of it for security)
    const value = process.env[varName];
    const maskedValue = value.substring(0, 4) + '...' + value.substring(value.length - 4);
    console.log(`✓ ${varName} is set: ${maskedValue}`);
  }
}

if (missingVars.length > 0) {
  console.error('\nThe following required environment variables are missing:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  console.error('\nPlease set these variables in your .env file.');
  process.exit(1);
} else {
  console.log('\nAll required environment variables are set!');
} 