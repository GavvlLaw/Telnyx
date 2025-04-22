# Telnyx Backend API

This is a backend API for Telnyx integration, providing telephony services including SMS, voice calls, and WebRTC.

## Replit Deployment Instructions

### Setting Up on Replit

1. **Create a New Replit Project**:
   - Create a new Node.js project on Replit
   - Or import directly from GitHub

2. **Database Setup**:
   - In Replit, click on the "Secrets" tab (key icon)
   - Add a new Neon PostgreSQL database using "Add a new secret > Database"
   - This will automatically add a `DATABASE_URL` environment variable

3. **Environment Variables**:
   - Add the following environment variables in the "Secrets" tab:
   ```
   TELNYX_API_KEY=REDACTED
   TELNYX_MESSAGING_PROFILE_ID=REDACTED
   TELNYX_SIP_CONNECTION_ID=REDACTED
   TELNYX_SIP_URI=your_telnyx_sip_uri
   TELNYX_WS_URI=your_telnyx_ws_uri
   FRONTEND_URL=your_frontend_url_or_*
   ```

4. **Telnyx Configuration**:
   - Set up your Telnyx account with:
     - A messaging profile
     - A SIP connection for WebRTC
     - Phone numbers
   - Update the webhook URL in Telnyx to point to: `https://your-repl-name.username.repl.co/webhook`

5. **Running the Application**:
   - Click the "Run" button in Replit
   - The database will automatically initialize when the application starts

### Development

To run the application locally:

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the required environment variables (see above)

3. Start the server:
   ```
   npm run dev
   ```

### API Endpoints

#### Phone Numbers
- `GET /api/phones/available` - Search for available phone numbers
- `GET /api/phones` - List phone numbers in account
- `POST /api/phones` - Purchase a new phone number
- `DELETE /api/phones/:phoneId` - Release a phone number

#### SMS
- `POST /api/sms/send` - Send an SMS message
- `GET /api/sms` - Get SMS messages

#### Calls
- `POST /api/calls/make` - Make an outbound call
- `GET /api/calls` - Get call history

#### WebRTC
- `POST /api/webrtc/credentials` - Generate SIP credentials
- `POST /api/webrtc/token` - Get WebRTC connection token

#### Admin
- `GET /api/admin/telnyx-config` - Get Telnyx configuration
- `PUT /api/admin/telnyx-api-key` - Update Telnyx API key

### Webhook
- `POST /webhook` - Endpoint for Telnyx events

## Database Schema

This application uses a PostgreSQL database with the following models:

- `User` - User accounts and profiles
- `SmsTemplate` - SMS message templates
- `SmsAutomation` - Automated SMS workflows
- `Call` - Call history records
- `Sms` - SMS message records
- `Voicemail` - Voicemail records
- `Config` - System configuration values

## Features

- User management with availability settings
- Telnyx phone number assignment to users
- Inbound and outbound call handling
- Voicemail with customizable greetings
- SMS messaging with auto-replies based on availability
- Call routing to live agents when the user is unavailable
- Webhook handlers for Telnyx events
- Comprehensive Telnyx phone number management API

## Prerequisites

- Node.js (v14+)
- MongoDB database
- Telnyx account with API key
- Publicly accessible URL for webhooks (e.g., via Replit)

## Telnyx API Testing

You can test the Telnyx API integration with the included test script:

```bash
node test-telnyx.js
```

The test script includes examples for:
- Searching available phone numbers
- Listing phone numbers in your account
- Getting phone number details
- Purchasing a phone number (disabled by default)
- Sending SMS messages (disabled by default)
- Releasing a phone number (disabled by default)

## Telnyx Setup

1. Create a Telnyx account at [telnyx.com](https://telnyx.com)
2. Generate an API key in your Telnyx dashboard
3. Create a Voice API Connection and note the Connection ID
4. Create a Messaging Profile and note the Messaging Profile ID
5. Configure webhooks in your Telnyx dashboard to point to your application's webhook URL:
   - For Call Control: `https://your-replit-app.repl.co/webhook`
   - For Messaging: `https://your-replit-app.repl.co/webhook`

## API Endpoints

### User Management

- `POST /api/users` - Create a new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/phone-number` - Assign Telnyx phone number to user
- `PUT /api/users/:id/availability` - Update user availability settings

### Phone Number Management

- `GET /api/phones/available` - Search for available phone numbers
- `GET /api/phones` - List all phone numbers in the account
- `GET /api/phones/:phoneId` - Get details for a specific phone number
- `POST /api/phones` - Purchase a new phone number
- `POST /api/phones/assign` - Assign a phone number to a user
- `PUT /api/phones/:phoneId` - Update phone number settings
- `DELETE /api/phones/:phoneId` - Release (delete) a phone number

### Call Management

- `GET /api/calls/user/:userId` - Get calls for a user
- `GET /api/calls/:id` - Get call by ID
- `POST /api/calls` - Make outbound call
- `PUT /api/calls/:id/notes` - Update call notes

### SMS Management

- `GET /api/sms/user/:userId` - Get messages for a user
- `GET /api/sms/:id` - Get message by ID
- `POST /api/sms` - Send SMS message

### Voicemail Management

- `GET /api/voicemails/user/:userId` - Get voicemails for a user
- `GET /api/voicemails/:id` - Get voicemail by ID
- `PUT /api/voicemails/:id/read` - Mark voicemail as read
- `PUT /api/voicemails/:id/notes` - Update voicemail notes
- `DELETE /api/voicemails/:id` - Delete voicemail
- `PUT /api/voicemails/user/:userId/greeting` - Update voicemail greeting

## Integration with Replit Frontend

To integrate this backend with a Replit frontend:

1. Deploy this backend to a hosting service or run it on Replit
2. Configure your frontend to make API calls to this backend
3. Use the API endpoints to manage users, calls, SMS, and voicemails

## Example: Creating a User and Assigning a Phone Number

```javascript
// Create a user
const user = await fetch('https://your-backend-url.com/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phoneNumber: '+15551234567'
  })
}).then(res => res.json());

// Search for available phone numbers
const phoneNumbers = await fetch('https://your-backend-url.com/api/phones/available?country_code=US&area_code=312', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
}).then(res => res.json());

// Purchase and assign a phone number to the user
await fetch('https://your-backend-url.com/api/phones', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: phoneNumbers.data[0].phone_number,
    userId: user._id
  })
}).then(res => res.json());
```

## License

MIT 