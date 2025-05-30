# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth for your self-hosted Personal KB deployment.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID for reference

## Step 2: Enable Google+ API

1. Go to the [APIs & Services Dashboard](https://console.cloud.google.com/apis/dashboard)
2. Click "Enable APIs and Services"
3. Search for "Google+ API" and enable it
4. Also enable "People API" for profile information

## Step 3: Configure OAuth Consent Screen

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Choose "External" for user type (unless you have Google Workspace)
3. Fill in the required information:
   - App name: "Personal KB"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
5. Add test users (your email and any others who need access)
6. Save and continue

## Step 4: Create OAuth Credentials

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Set the name: "Personal KB Web Client"
5. Add authorized redirect URIs:
   - For local development: `http://localhost:5000/api/auth/google/callback`
   - For production: `https://your-domain.com/api/auth/google/callback`
6. Click "Create"
7. Copy the Client ID and Client Secret

## Step 5: Configure Environment Variables

Add these to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

## Step 6: Update Authorized Domains

If deploying to production:

1. Go back to OAuth consent screen
2. Add your production domain to "Authorized domains"
3. Update the redirect URI in credentials to match your domain

## Step 7: Test the Setup

1. Restart your application
2. Visit your application URL
3. You should see a "Sign in with Google" option
4. Test the login flow

## Troubleshooting

**"redirect_uri_mismatch" error:**
- Check that your redirect URI exactly matches what's configured in Google Cloud Console
- Include the protocol (http/https) and port if applicable

**"access_blocked" error:**
- Make sure your app is in "Testing" mode if not yet verified
- Add your email to test users in OAuth consent screen

**"invalid_client" error:**
- Verify your Client ID and Client Secret are correct
- Check that the Google+ API is enabled

## Security Notes

- Keep your Client Secret secure and never commit it to version control
- Use environment variables for credentials
- Consider setting up domain verification for production use
- Regularly review and rotate credentials if needed

## Production Considerations

For production deployments:
- Set up proper domain verification
- Consider applying for OAuth verification if you need broader access
- Use HTTPS for all redirect URIs
- Set up proper error handling and user feedback