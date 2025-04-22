# Telnyx API Setup Guide

This guide will help you set up your Telnyx API credentials correctly to work with this application.

## 1. Create a Telnyx Account

If you don't already have one, create a Telnyx account at [telnyx.com](https://telnyx.com).

## 2. Get Your API Key

1. Log in to the [Telnyx Portal](https://portal.telnyx.com/)
2. Navigate to **Auth** > **API Keys** in the left sidebar
3. Click **Create API Key**
4. Give your API key a name (e.g., "My App")
5. Copy the API key - it should start with `KEY` followed by alphanumeric characters

## 3. Set Up Your Voice API Connection

1. In the Telnyx Portal, navigate to **Voice API** > **Call Control**
2. Click **Add New SIP Connection**
3. Choose **Call Control** as the connection type
4. Set up your connection with:
   - A unique connection name
   - Enable DTMF detection
   - Set webhook URL to your application's webhook endpoint
   - Choose preferred settings for other options
5. Click **Save** when done
6. Copy the Connection ID from the resulting page

## 4. Set Up Your Messaging Profile

1. In the Telnyx Portal, navigate to **Messaging** > **Messaging Profiles**
2. Click **Add New Profile**
3. Set up your profile with:
   - A unique profile name
   - Set webhook URL to your application's webhook endpoint
   - Choose preferred settings for other options
4. Click **Save** when done
5. Copy the Messaging Profile ID from the resulting page

## 5. Configure Your Application

Update your `.env` file with the following variables:

```
TELNYX_API_KEY=your_api_key_here
TELNYX_SIP_CONNECTION_ID=your_connection_id_here
TELNYX_MESSAGING_PROFILE_ID=your_messaging_profile_id_here
WEBHOOK_URL=your_webhook_url_here
```

You can use the utility script to update your API key:

```
node update-telnyx-key.js
```

## 6. Test Your Configuration

Run the test script to verify your Telnyx API integration:

```
node test-telnyx-simple.js
```

## 7. Troubleshooting

If you encounter `401 Authentication failed` errors:

1. Ensure your API key is entered correctly, including the `KEY` prefix
2. Verify that the API key is active in the Telnyx Portal
3. Make sure you're using the correct key for your environment (test or production)
4. Check that your account is in good standing with Telnyx

If you encounter other issues, please refer to the [Telnyx API Documentation](https://developers.telnyx.com/). 