# Building Personal KB Android App

This guide will help you build the Personal KB knowledge management app as a native Android application (.apk file).

## Prerequisites

### Local Development Setup

**Option 1: Android Studio (Recommended)**
1. Install [Android Studio](https://developer.android.com/studio)
2. Install Android SDK (API level 33 or higher)
3. Install Java 17 or higher
4. Install Node.js 18 or higher

**Option 2: Command Line Tools**
1. Install [Android SDK Command Line Tools](https://developer.android.com/studio/command-line)
2. Install Java 17 or higher
3. Install Node.js 18 or higher

## Building the APK

### Method 1: Using GitHub Actions (Automated)

1. **Push to GitHub**: Commit and push your code to a GitHub repository
2. **Enable Actions**: Go to your repository's Actions tab on GitHub
3. **Run Workflow**: The "Build Android APK" workflow will automatically run and create an APK
4. **Download APK**: Once complete, download the APK from the workflow artifacts

### Method 2: Local Build

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build Web App**
   ```bash
   npm run build
   ```

3. **Sync Capacitor**
   ```bash
   npx cap sync android
   ```

4. **Build APK**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

5. **Find Your APK**
   The APK will be located at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Method 3: Using Android Studio

1. **Open Project**
   ```bash
   npx cap open android
   ```

2. **Build in Android Studio**
   - Click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
   - Wait for the build to complete
   - Click "locate" to find your APK file

## App Features in Mobile Version

The Android app includes all web features plus mobile-specific enhancements:

### Core Features
- **Offline Support**: Create and edit entries without internet connection
- **Authentication**: Secure login with Replit Auth
- **Entry Types**: Journal, Notes, People, Places, Things with structured data
- **Hashtag Linking**: Navigate between related entries via hashtags
- **Search**: Full-text search across all entries
- **Export**: Download all entries as organized markdown files

### Mobile Enhancements
- **Camera Integration**: Take photos directly from the app
- **File Sharing**: Share entries with other apps
- **Device Information**: Access device-specific details
- **Network Detection**: Automatic sync when online
- **Native Status Bar**: Properly styled status bar
- **Splash Screen**: Professional app loading screen

### Permissions

The app requests these permissions:
- **Internet**: For syncing data with your server
- **Camera**: For taking photos within entries
- **Storage**: For importing/exporting files
- **Network State**: For detecting connectivity

## Installation on Android Device

### Install Debug APK (Development)
1. Enable "Developer Options" on your Android device
2. Enable "Install unknown apps" for your file manager
3. Transfer the APK to your device
4. Tap the APK file to install

### Install via ADB (Advanced)
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Configuration for Production

### 1. Update App Configuration

Edit `capacitor.config.json`:
```json
{
  "appId": "com.yourcompany.personalkb",
  "appName": "Personal KB",
  "webDir": "dist/public",
  "server": {
    "url": "https://your-production-domain.com",
    "cleartext": false
  }
}
```

### 2. Set Production Server URL

The app needs to connect to your deployed Personal KB server. Update the server URL in the configuration to point to your production deployment.

### 3. Generate Signed APK (Play Store)

For Google Play Store distribution:

1. **Generate Keystore**
   ```bash
   keytool -genkey -v -keystore my-release-key.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
   ```

2. **Configure Signing**
   Edit `android/app/build.gradle` to add signing configuration

3. **Build Release**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

## Troubleshooting

### Common Issues

**Build Fails**
- Ensure Java 17 is installed and set as JAVA_HOME
- Update Android SDK to latest version
- Clear gradle cache: `cd android && ./gradlew clean`

**App Crashes on Launch**
- Check that the server URL is accessible
- Verify internet connectivity
- Check Android logs: `adb logcat`

**Features Not Working**
- Camera: Ensure camera permissions are granted
- File operations: Check storage permissions
- Network features: Verify internet connection

### Getting Help

1. Check the browser console in the app for JavaScript errors
2. Use `adb logcat` to view Android system logs
3. Test the web version first to isolate mobile-specific issues

## App Store Distribution

### Google Play Store
1. Create a Google Play Developer account
2. Generate a signed AAB (Android App Bundle)
3. Upload through Google Play Console
4. Follow Google's review process

### Alternative Distribution
- F-Droid (open source apps)
- Amazon Appstore
- Direct APK distribution
- Enterprise distribution (for organizations)

## Security Considerations

- The app stores authentication tokens securely using Android Keystore
- All data transmission uses HTTPS
- Local data is stored in app-private directories
- Camera and storage permissions are requested only when needed

## Performance Notes

- Initial app load may take a few seconds while loading the web assets
- Subsequent launches are faster due to caching
- Offline mode allows full functionality without internet
- Background sync ensures data stays up-to-date

## Next Steps

After building your APK:
1. Test thoroughly on different Android devices
2. Configure your production server URL
3. Generate a signed release build for distribution
4. Consider adding push notifications for real-time updates
5. Implement additional mobile-specific features as needed