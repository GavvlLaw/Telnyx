const fs = require('fs');

try {
  // Read the .env file
  const envContent = fs.readFileSync('.env', 'utf8');
  
  // Write the content to a verification file
  fs.writeFileSync('env-verification.txt', envContent);
  
  // Parse and validate key components
  const variables = {};
  envContent.split('\n').forEach(line => {
    if (line.includes('=')) {
      const [key, value] = line.split('=', 2);
      if (key && key.trim()) {
        variables[key.trim()] = value ? value.trim() : '';
      }
    }
  });

  // Create validation results
  let validationResults = "VALIDATION RESULTS:\n\n";
  
  // Check Telnyx API Key
  const apiKeyValid = variables.TELNYX_API_KEY && variables.TELNYX_API_KEY.startsWith('KEY');
  validationResults += `TELNYX_API_KEY: ${apiKeyValid ? 'VALID' : 'INVALID'}\n`;
  
  // Check SIP Connection ID
  const sipIdValid = variables.TELNYX_SIP_CONNECTION_ID && !isNaN(variables.TELNYX_SIP_CONNECTION_ID);
  validationResults += `TELNYX_SIP_CONNECTION_ID: ${sipIdValid ? 'VALID' : 'INVALID'}\n`;
  
  // Check TeXML App ID
  const texmlIdValid = variables.TELNYX_TEXML_APP_ID && !isNaN(variables.TELNYX_TEXML_APP_ID);
  validationResults += `TELNYX_TEXML_APP_ID: ${texmlIdValid ? 'VALID' : 'INVALID'}\n`;
  
  // Check Messaging Profile ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const msgProfileIdValid = variables.TELNYX_MESSAGING_PROFILE_ID && 
                            uuidRegex.test(variables.TELNYX_MESSAGING_PROFILE_ID);
  validationResults += `TELNYX_MESSAGING_PROFILE_ID: ${msgProfileIdValid ? 'VALID' : 'INVALID'}\n`;
  
  // Check webhook URL
  const webhookUrlValid = variables.WEBHOOK_URL && variables.WEBHOOK_URL.startsWith('https://');
  validationResults += `WEBHOOK_URL: ${webhookUrlValid ? 'VALID' : 'INVALID'}\n`;
  
  // Check API key
  const apiKeySecureValid = variables.API_KEY && variables.API_KEY.length > 10;
  validationResults += `API_KEY: ${apiKeySecureValid ? 'VALID' : 'INVALID'}\n`;
  
  // Write validation results
  fs.writeFileSync('env-validation.txt', validationResults);
  
  console.log('Environment variable verification complete. Check env-verification.txt and env-validation.txt files.');
} catch (error) {
  console.error("Error verifying .env file:", error);
  fs.writeFileSync('env-error.txt', error.toString());
} 