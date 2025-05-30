# Building Personal KB Android App

This guide will help you build the Personal KB knowledge management app as a native Android application (.apk file).

## Prerequisites

### Local Development Setup

**Option 1: Android Studio (Recommended)**
1. Install [Android Studio](https://developer.android.com/studio)
2. Install Android SDK (API level 33 or higher)
3. Install Java 17 (exactly version 17 - required for compatibility)
4. Install Node.js 18 or higher

**Option 2: Command Line Tools**
1. Install [Android SDK Command Line Tools](https://developer.android.com/studio/command-line)
2. Install Java 17 (exactly version 17 - required for compatibility)
3. Install Node.js 18 or higher

**Important Java Version Note:**
The Android build requires exactly Java 17. If you have multiple Java versions installed:
- Check your version: `java -version`
- Set JAVA_HOME if needed: `export JAVA_HOME=/path/to/java-17`
- On Ubuntu/Debian: `sudo apt install openjdk-17-jdk`
- On macOS with Homebrew: `brew install openjdk@17`

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
- **Offline Mode with Two-Way Sync**: Create and edit entries while offline, automatically sync when back online
- **Camera Integration**: Take photos directly from the app
- **File Sharing**: Share entries with other apps
- **Device Information**: Access device-specific details
- **Network Detection**: Automatic sync when online
- **Native Status Bar**: Properly styled status bar
- **Splash Screen**: Professional app loading screen

### Two-Way Offline Sync

The Android app includes robust offline functionality:

**When Offline:**
- Create new entries (stored locally with temporary IDs)
- Edit existing entries (changes queued for sync)
- Browse all previously synced content
- Search through offline content
- Full app functionality maintained

**When Back Online:**
- Automatically detects network connectivity
- Syncs all offline changes to the server
- Resolves any conflicts intelligently
- Updates local storage with server responses
- Shows sync progress and pending item count

**Sync Indicator:**
- Visual indicator shows online/offline status
- Displays count of pending changes
- Manual sync trigger available
- Real-time sync progress feedback

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

### Java Version Compatibility Issues

The most common Android build failure is "invalid source release: 21" or similar Java version errors. Here's how to fix it:

**Step 1: Verify Java 17 Installation**
```bash
java -version
javac -version
```
Both should show version 17.x.x

**Step 2: Install Java 17 if needed**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-17-jdk

# macOS with Homebrew
brew install openjdk@17

# Windows - Download from https://adoptium.net/
```

**Step 3: Set JAVA_HOME Environment Variable**
```bash
# Linux/macOS (add to ~/.bashrc or ~/.zshrc)
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

# macOS with Homebrew
export JAVA_HOME=/opt/homebrew/opt/openjdk@17

# Windows (System Environment Variables)
JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.x.x-hotspot
```

**Step 4: Clean and Rebuild**
```bash
cd android
./gradlew clean
rm -rf .gradle
./gradlew assembleDebug --stacktrace
```

**Step 5: If still failing, regenerate Android project**
```bash
rm -rf android
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

### Kotlin/Java Compatibility Issues

If you see "Inconsistent JVM-target compatibility detected":

This happens when Java and Kotlin target different JVM versions. The build files are already configured to fix this, but if you encounter this error:

**Verify Kotlin configuration in android/app/build.gradle:**
```gradle
compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
}

kotlinOptions {
    jvmTarget = '17'
}
```

**Clean and rebuild:**
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### Memory and Gradle Daemon Issues

If you see "unable to start the daemon process" or "OutOfMemoryError":

**The gradle.properties is already configured with optimal settings:**
```bash
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.daemon=false
```

**If build still fails, try:**
```bash
cd android
./gradlew clean --no-daemon --stacktrace
./gradlew assembleDebug --no-daemon --stacktrace
```

### Other Common Issues

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