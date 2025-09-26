# Firebase Functions Setup for WhatsApp Integration

## Prerequisites
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize your project: `firebase use --add` (select your existing Firebase project)

## Setup Steps

### 1. Install Functions Dependencies
```bash
cd functions
npm install
```

### 2. Set Environment Variables
Configure your WhatsApp credentials as Firebase Functions environment variables:

```bash
# Set WhatsApp API Token
firebase functions:config:set whatsapp.api_token="YOUR_WHATSAPP_API_TOKEN"

# Set WhatsApp Phone Number ID
firebase functions:config:set whatsapp.phone_number_id="YOUR_WHATSAPP_PHONE_NUMBER_ID"
```

**Note:** Replace `YOUR_WHATSAPP_API_TOKEN` and `YOUR_WHATSAPP_PHONE_NUMBER_ID` with your actual WhatsApp Business API credentials.

### 3. Deploy Functions
```bash
# Build and deploy the functions
firebase deploy --only functions
```

### 4. Test the Integration
After deployment, test sending a WhatsApp message through your chat interface. The function will:
- Validate the message data
- Use your WhatsApp credentials securely
- Send the message via WhatsApp Business API
- Return success/error status to your frontend

## Environment Variables in Functions
The function looks for these environment variables:
- `WHATSAPP_API_TOKEN` or `VITE_WHATSAPP_API_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID` or `VITE_WHATSAPP_PHONE_NUMBER_ID`

## Local Development
To test functions locally:
```bash
cd functions
npm run serve
```

This will start the Firebase Functions emulator where you can test your functions before deploying.

## Monitoring
View function logs:
```bash
firebase functions:log
```

## Security Notes
- WhatsApp credentials are stored securely in Firebase Functions configuration
- They are never exposed to the frontend
- All API calls go through your secure backend function