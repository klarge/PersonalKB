# Quick APK Build Guide

Your Personal KB web app has been successfully converted to an Android app! Here's how to build the APK:

## Automated Build (Recommended)

1. **Push to GitHub**: Upload your project to a GitHub repository
2. **Enable GitHub Actions**: The workflow is already configured
3. **Download APK**: The build will automatically create an APK file you can download

## Local Build

If you prefer to build locally, you'll need:
- Android Studio or Android SDK
- Java 17+
- Node.js 18+

Then run these commands:
```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Your APK will be in `android/app/build/outputs/apk/debug/app-debug.apk`

## What's Included

The Android app includes all your web features:
- Complete authentication system
- All entry types (Journal, Notes, People, Places, Things)
- Hashtag linking and backlinking
- Full-text search
- Export functionality
- API token management
- Visual mindmap
- Dark/light theme support

Plus mobile enhancements:
- Camera integration for photos
- File sharing capabilities
- Offline functionality
- Native Android UI elements

## Installation

To install on your Android device:
1. Enable "Install unknown apps" in Settings
2. Transfer the APK file to your device
3. Tap to install

The detailed build instructions are in `ANDROID_BUILD.md`.

## Server Configuration

For the mobile app to work, you'll need your Personal KB server running. The app can connect to:
- Your Replit deployment
- Self-hosted server
- Local development server (for testing)

Update the server URL in `capacitor.config.json` to point to your deployed backend.