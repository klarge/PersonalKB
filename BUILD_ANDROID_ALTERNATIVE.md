# Alternative Android Build Methods

If the automated GitHub Actions build continues to fail, here are alternative approaches to build the Android APK:

## Method 1: Local Build with Android Studio

This is the most reliable method for building the Android app:

### Prerequisites
1. Install [Android Studio](https://developer.android.com/studio)
2. Install Java 17 (exactly this version)
3. Install Node.js 18+

### Steps
1. **Clone or download the project**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the web assets:**
   ```bash
   npm run build
   ```

4. **Generate Android project:**
   ```bash
   npx cap add android
   npx cap sync android
   ```

5. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

6. **Build in Android Studio:**
   - Click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
   - Find the APK in `android/app/build/outputs/apk/debug/`

## Method 2: Command Line Build (Advanced)

If you prefer command line and have the environment properly set up:

```bash
# Ensure you have Java 17
export JAVA_HOME=/path/to/java-17
export ANDROID_HOME=/path/to/android-sdk

# Build the project
npm install
npm run build
npx cap sync android

# Build APK
cd android
./gradlew clean
./gradlew assembleDebug
```

## Method 3: Docker Build Environment

Create a consistent build environment using Docker:

```dockerfile
FROM openjdk:17-jdk-slim

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# Install Android SDK
RUN apt-get update && apt-get install -y wget unzip
RUN wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
RUN unzip commandlinetools-linux-9477386_latest.zip -d /android-sdk
ENV ANDROID_HOME=/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Accept licenses and install build tools
RUN yes | sdkmanager --licenses
RUN sdkmanager "build-tools;33.0.0" "platforms;android-33"

# Build the app
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npx cap sync android
RUN cd android && ./gradlew assembleDebug
```

## Method 4: Online Build Services

Consider using online build services like:
- **Expo EAS Build** (requires Expo)
- **Bitrise** (free tier available)
- **GitHub Codespaces** (different environment than Actions)

## Troubleshooting Common Issues

### Java Version Problems
- Ensure exactly Java 17 is installed and active
- Check: `java -version` and `javac -version`
- Set JAVA_HOME correctly

### Android SDK Issues
- Install Android SDK version 33 or higher
- Accept all SDK licenses: `yes | sdkmanager --licenses`
- Set ANDROID_HOME environment variable

### Gradle Issues
- Clear Gradle cache: `rm -rf ~/.gradle/caches`
- Stop all Gradle daemons: `./gradlew --stop`
- Try building without daemon: `./gradlew assembleDebug --no-daemon`

### Capacitor Issues
- Delete and regenerate: `rm -rf android && npx cap add android`
- Sync again: `npx cap sync android`

## What the APK Includes

The Android APK will include:
- Full offline functionality with IndexedDB storage
- Two-way sync when internet is available
- Native camera integration
- File sharing capabilities
- Professional splash screen and app icon
- All web app features in native mobile format

## Distribution

Once you have the APK:
- **Development**: Install directly on devices via USB debugging
- **Internal Testing**: Upload to Google Play Console for internal testing
- **Public Release**: Publish through Google Play Store (requires signing and review)

The APK file will be named `app-debug.apk` and can be installed on any Android device with "Unknown Sources" enabled in developer settings.