#!/bin/bash

# Extract API key from .env file
API_KEY=$(grep TELNYX_API_KEY .env | cut -d= -f2)

echo "===== Telnyx API Key Check ====="
echo "First 4 chars: ${API_KEY:0:4}..."
echo "Key length: ${#API_KEY} characters"

# Check format
if [[ "${API_KEY:0:3}" != "KEY" ]]; then
  echo "WARNING: Key doesn't start with 'KEY'"
fi

# Test API connection
echo -e "\n===== Testing API Connection ====="
echo "Sending API request..."

# Use curl to test the connection
response=$(curl -s -i -X GET \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  https://api.telnyx.com/v2/available_phone_numbers)

# Extract status code
status_code=$(echo "$response" | grep "HTTP" | awk '{print $2}')

echo "API Response Code: $status_code"

if [[ "$status_code" == "200" ]]; then
  echo "SUCCESS: API connection working correctly"
else
  echo "ERROR: API connection failed"
  
  # Extract error message
  error_msg=$(echo "$response" | grep -Eo '"detail":"[^"]+"' | cut -d':' -f2- | tr -d '"')
  
  if [[ ! -z "$error_msg" ]]; then
    echo "Error message: $error_msg"
  else
    echo "Full response:"
    echo "$response" | tail -20
  fi
  
  # Provide guidance
  echo -e "\n===== Recommendations ====="
  echo "1. Login to Telnyx Portal: https://portal.telnyx.com"
  echo "2. Go to Auth > API Keys section"
  echo "3. Create a new API key"
  echo "4. Update your .env file with the new key"
fi 