const fs = require('fs');

try {
  const content = fs.readFileSync('.env', 'utf8');
  console.log(content);

  // Parse and validate key components
  const variables = {};
  content.split('\n').forEach(line => {
    if (line.includes('=')) {
      const [key, value] = line.split('=', 2);
      variables[key.trim()] = value.trim();
    }
  });

  console.log("\nKey validations:");
  
  // Check Telnyx API Key
  console.log(`TELNYX_API_KEY valid: ${variables.TELNYX_API_KEY && variables.TELNYX_API_KEY.startsWith('KEY')}`);
  
  // Check SIP Connection ID
  console.log(`SIP Connection ID valid: ${variables.TELNYX_SIP_CONNECTION_ID && !isNaN(variables.TELNYX_SIP_CONNECTION_ID)}`);
  
  // Check TeXML App ID
  console.log(`TeXML App ID valid: ${variables.TELNYX_TEXML_APP_ID && !isNaN(variables.TELNYX_TEXML_APP_ID)}`);
  
  // Check Messaging Profile ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  console.log(`Messaging Profile ID valid UUID: ${variables.TELNYX_MESSAGING_PROFILE_ID && uuidRegex.test(variables.TELNYX_MESSAGING_PROFILE_ID)}`);

} catch (error) {
  console.error("Error reading .env file:", error);
} 