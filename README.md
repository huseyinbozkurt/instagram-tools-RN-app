# Instagram Tools

A mobile app built with React Native and Expo that provides utility tools for Instagram: detecting accounts that don't follow you back and downloading media (posts, reels, stories, highlights).

## Features

### Unfollowers Check

- Fetches your complete following and followers lists via Instagram's private API
- Compares the two lists and shows accounts that don't follow you back
- Displays stats: total following, total followers, and non-followers count
- Filterable results list with search by username or full name
- Shows verified badges and private account indicators
- Caches results locally so you can revisit without re-fetching
- Requests are spaced out with random delays (1.2-1.9s) to avoid rate limits

### Media Downloader

- Supports posts, reels, stories, highlights, and carousels
- Paste an Instagram link from your clipboard to fetch media info
- For carousels and highlights, select which items to download from a grid
- Long-press any item in the grid to open a full-screen preview modal:
  - Swipe horizontally to browse all items
  - Videos auto-play with loop, start muted
  - Mute/unmute toggle button on videos
  - Checkbox to toggle download selection per item
- Saves media directly to your device's photo library
- Supports both web URLs and Instagram app share links (including the `/s/` base64-encoded highlight format)

### Supported URL Formats

| Type | Example |
|---|---|
| Post | `https://www.instagram.com/p/ABC123/` |
| Reel | `https://www.instagram.com/reel/ABC123/` |
| TV | `https://www.instagram.com/tv/ABC123/` |
| Story | `https://www.instagram.com/stories/username/1234567890/` |
| Highlight (web) | `https://www.instagram.com/stories/highlights/1234567890/` |
| Highlight (app share) | `https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDY0...` |

## Architecture

The app uses a **hidden WebView bridge** pattern to interact with Instagram:

```
React Native UI
      |
WebViewBridgeProvider (loads instagram.com in a hidden WebView)
      |
      +-- Authentication: detects login via ds_user_id cookie / API check
      +-- API calls: injects JavaScript into the WebView to call Instagram's private API
      +-- Cookie forwarding: passes session cookies for authenticated file downloads
```

When not logged in, the WebView expands to full screen so the user can log in through Instagram's standard web flow. Once authenticated, the WebView shrinks to 1x1px off-screen but remains active for API calls.

### Project Structure

```
app/
  _layout.tsx                 Root layout (splash screen, WebView provider, Stack nav)
  (tabs)/
    _layout.tsx               Tab navigator (Unfollowers, Download)
    index.tsx                 Unfollowers screen
    downloader.tsx            Download screen

src/
  bridge/
    WebViewBridge.tsx         WebView provider, bridge context, call() API
    injectedScript.ts         JS injected into instagram.com for auth detection

  instagram/
    api.ts                    Instagram API helpers (fetchPage, fetchMediaInfo, etc.)
    mediaExtractor.ts         URL parsing, shortcode decoding, media normalization
    types.ts                  TypeScript types for Instagram API responses

  hooks/
    useUnfollowerCheck.ts     Unfollower detection state machine with caching
    useMediaDownload.ts       Media download workflow orchestration

  download/
    downloader.ts             File download (expo-file-system) + save to library

  components/
    UserCard.tsx              Unfollower list item card
    MediaSelector.tsx         Selectable media grid with long-press preview
    MediaPreviewModal.tsx     Full-screen media viewer with video playback
```

## Prerequisites

- **Node.js** >= 18 (managed via nvm is fine)
- **Yarn** (v1 classic)
- **Expo CLI** (`npx expo`)
- **Android Studio** with Android SDK (for Android builds)
- **Xcode** 15+ (for iOS builds, macOS only)

## Setup

```bash
# Clone the repository
git clone https://github.com/huseyinbozkuurt/instagram-tools-RN-app.git
cd instagram-tools-RN-app

# Install dependencies
yarn install
```

### Android-specific setup

If you use **nvm** to manage Node.js, Android Studio's Gradle daemon won't find `node` by default. Create a system-wide symlink:

```bash
sudo ln -sf $(which node) /usr/local/bin/node
```

> **Note:** Re-run this command after switching Node.js versions via nvm.

### iOS-specific setup

```bash
cd ios && pod install && cd ..
```

## Running

```bash
# Start Metro bundler
yarn start

# Run on Android
yarn android

# Run on iOS
yarn ios
```

### Prebuild (regenerate native projects)

```bash
# Both platforms
yarn prebuild

# Single platform
yarn prebuild:ios
yarn prebuild:android
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54, React Native 0.81 |
| Language | TypeScript 5.9 |
| Navigation | expo-router 6 (file-based routing) |
| WebView | react-native-webview 13 |
| Video | expo-video 3 |
| File System | expo-file-system 19 |
| Media Library | expo-media-library 18 |
| Clipboard | expo-clipboard 8 |
| Icons | @expo/vector-icons (Ionicons) |

## How It Works

### Authentication

The app loads `https://www.instagram.com/` in a hidden WebView. On page load, injected JavaScript checks for the `ds_user_id` cookie. If not found, it falls back to calling `/api/v1/accounts/current_user/` with CSRF headers. The auth status is communicated to React Native via `postMessage`.

When the user needs to log in, the WebView is shown full-screen over the app UI. After successful login, it hides again.

### Unfollower Detection

1. Paginates through `/api/v1/friendships/{userId}/following/` (50 per page)
2. Paginates through `/api/v1/friendships/{userId}/followers/` (50 per page)
3. Builds a `Set` of follower IDs and filters the following list
4. Results are cached to `unfollower_results.json` in the document directory

### Media Download

1. User copies an Instagram URL and taps "Paste from Clipboard"
2. URL is parsed to extract the media type and ID (shortcode is decoded to numeric media ID via base-64 arithmetic)
3. Media info is fetched via the WebView bridge (`/api/v1/media/{id}/info/` or `/api/v1/feed/reels_media/`)
4. Best quality image/video candidates are selected from the API response
5. Files are downloaded to the cache directory with Instagram session cookies
6. `MediaLibrary.saveToLibraryAsync()` moves them to the device's photo library
7. Temporary cache files are cleaned up

### Permissions

| Platform | Permission | Purpose |
|---|---|---|
| Android 13+ | None required | `saveToLibraryAsync` uses `ContentResolver.insert()` |
| Android 10-12 | `WRITE_EXTERNAL_STORAGE` | Write-only access for saving media |
| Android < 10 | `READ/WRITE_EXTERNAL_STORAGE` | Full storage access |
| iOS | `NSPhotoLibraryAddUsageDescription` | Save to photo library |

## Configuration

### App identifiers

- **Android package:** `com.huseyinbozkuurt.instagramtools`
- **iOS bundle ID:** `com.huseyinbozkuurt.instagramtools`
- **URL scheme:** `instagram-tools://`

### Build settings

Key settings in `android/gradle.properties`:

- `newArchEnabled=true` - React Native New Architecture enabled
- `hermesEnabled=true` - Hermes JS engine
- `edgeToEdgeEnabled=true` - Edge-to-edge display

## Disclaimer

This app uses Instagram's private API for educational purposes. It is not affiliated with, endorsed by, or connected to Instagram or Meta. Use responsibly and at your own risk. Excessive API requests may result in temporary or permanent restrictions on your Instagram account.

## License

Private project. All rights reserved.
