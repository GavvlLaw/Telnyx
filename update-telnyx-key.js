require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Telnyx API Key Update Utility');
console.log('-----------------------------');
console.log('This utility will help you update your Telnyx API key in your .env file.');
console.log('Your current Telnyx API key appears to be invalid or expired.');
console.log('\nYou can find your API key in the Telnyx Portal at:');
console.log('https://portal.telnyx.com/#/app/api-keys\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
let envContent = '';
let hasEnvFile = false;

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  hasEnvFile = true;
  console.log('Found existing .env file.');
} catch (error) {
  console.log('No .env file found. A new one will be created.');
}

// Function to update the .env file
function updateEnvFile(key, value) {
  if (!hasEnvFile) {
    // Create new .env file
    fs.writeFileSync(envPath, `${key}=${value}\n`);
    console.log('.env file created successfully.');
    return;
  }

  // Update existing .env file
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    // Replace existing key
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    // Add new key
    envContent += `\n${key}=${value}`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`${key} updated successfully in .env file.`);
}

// Prompt for API key
rl.question('Please enter your Telnyx API key (starts with "KEY"): ', (apiKey) => {
  if (!apiKey.trim()) {
    console.log('No API key entered. Operation cancelled.');
    rl.close();
    return;
  }

  if (!apiKey.startsWith('KEY')) {
    console.log('Warning: Telnyx API keys typically start with "KEY". The key you entered may not be valid.');
    rl.question('Continue anyway? (y/n): ', (answer) => {
      if (answer.toLowerCase() !== 'y') {
        console.log('Operation cancelled.');
        rl.close();
        return;
      }
      updateEnvFile('TELNYX_API_KEY', apiKey);
      rl.close();
    });
  } else {
    updateEnvFile('TELNYX_API_KEY', apiKey);
    rl.close();
  }
});

rl.on('close', () => {
  console.log('\nTo test your new API key, run:');
  console.log('node test-telnyx-simple.js');
  console.log('\nGoodbye!');
  process.exit(0);
}); 