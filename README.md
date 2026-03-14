# device-shots

A CLI tool that captures screenshots from running iOS simulators and Android emulators, then frames them for store-ready use. iOS screenshots get real device bezels, Android screenshots get a clean black border with rounded corners. Built for developers who need store-ready screenshots without manual work.

## What it does

1. **Discovers devices** — Finds all running iOS simulators and Android emulators that have your app installed
2. **Cleans up status bars** — Sets a uniform status bar (9:41, full battery, full signal) on all devices before capturing
3. **Captures screenshots** — Takes screenshots from every discovered device in one go
4. **Frames iOS screenshots** — Wraps iOS screenshots in device bezels (iPhone/iPad frames) using [device-frames-core](https://pypi.org/project/device-frames-core/)
5. **Frames Android screenshots** — Adds uniform black padding with matching rounded corners on both the screenshot and frame (requires ImageMagick)
6. **Organizes by screen size** — Saves screenshots into store-aligned size buckets (e.g. `6.9`, `6.3`, `phone`) instead of device names

## Use cases

- Generating App Store and Play Store screenshots across multiple device sizes at once
- Keeping consistent, reproducible screenshot sets for your app listing
- Automating screenshot capture in CI/CD pipelines
- Quickly re-capturing screenshots after UI changes

## Prerequisites

### Required

- **Node.js 18+**
- **Xcode Command Line Tools** (for iOS) — provides `xcrun simctl`
- **Android SDK** (for Android) — provides `adb`. The tool looks for it at `$ANDROID_HOME/platform-tools/adb` or `~/Library/Android/sdk/platform-tools/adb`

### Optional

- **ImageMagick** — needed for Android screenshot framing (black border + rounded corners). Install with `brew install imagemagick`
- **Python 3** — needed for iOS screenshot framing with device bezels. The tool auto-creates a virtual environment at `~/.device-shots/.venv` and installs `device-frames-core` and `Pillow` automatically on first use

## Install

```bash
npm install -g device-shots
```

Or run directly with `npx`:

```bash
npx device-shots capture --bundle-id com.example.myapp
```

## Usage

### Capture screenshots

```bash
# Interactive — prompts for screenshot name
device-shots capture --bundle-id com.example.myapp

# Non-interactive — provide name directly
device-shots capture dashboard --bundle-id com.example.myapp

# iOS only, custom output directory
device-shots capture home -b com.example.myapp -p ios -o ./.store-assets

# Skip framing
device-shots capture login -b com.example.myapp --no-frame

# Custom status bar time
device-shots capture checkout -b com.example.myapp --time "10:30"
```

### Frame existing screenshots

```bash
# Frame all unframed screenshots (iOS + Android) in ./.screenshots
device-shots frame

# Frame from a specific directory
device-shots frame ./.my-screenshots

# Re-frame everything (overwrite existing framed images)
device-shots frame --force
```

### Initialize config

```bash
device-shots init
```

Creates a `.device-shotsrc.json` in the current directory so you don't have to pass `--bundle-id` every time. It will ask for both production and dev bundle IDs:

```json
{
  "bundleId": ["com.example.myapp", "com.example.myapp.dev"],
  "output": "./.screenshots",
  "platform": "both",
  "time": "9:41",
  "frame": true
}
```

A single string also works if you only have one bundle ID:

```json
{
  "bundleId": "com.example.myapp"
}
```

## Config file

The tool uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig), so you can configure it in any of these ways:

- `.device-shotsrc.json`
- `.device-shotsrc.yaml`
- `.device-shotsrc.js`
- `device-shots.config.js`
- `"device-shots"` key in `package.json`

## Multiple bundle IDs

Most apps have separate bundle IDs for production and development builds. You can pass an array to `bundleId` in the config:

```json
{
  "bundleId": ["com.example.myapp", "com.example.myapp.dev"]
}
```

During discovery, the tool tries each bundle ID on every running device and captures from whichever build is installed. This means it works regardless of whether you have the dev or production build running.

The CLI `--bundle-id` flag accepts a single ID for quick one-off captures.

## Output structure

Screenshots are organized by platform and screen size bucket, matching App Store and Play Store requirements:

```
.screenshots/
├── ios/
│   ├── 6.9/                          # iPhone 16 Pro Max
│   │   ├── dashboard.png
│   │   ├── dashboard_framed.png
│   │   ├── settings.png
│   │   └── settings_framed.png
│   ├── 6.5/                          # iPhone 14 Plus, 13 Pro Max
│   │   ├── dashboard.png
│   │   └── dashboard_framed.png
│   └── 6.3/                          # iPhone 16 Pro, 16, 15 Pro, 15
│       └── ...
├── android/
│   └── phone/                        # Pixel 9 Pro, etc.
│       ├── dashboard.png
│       ├── dashboard_framed.png
│       ├── settings.png
│       └── settings_framed.png
└── metadata.json
```

### Screen size buckets

**iOS** — Maps to App Store Connect display size categories:

| Bucket | Devices |
|--------|---------|
| `6.9` | iPhone 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max |
| `6.5` | iPhone 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max, XS Max |
| `6.3` | iPhone 16 Pro, 16, 15 Pro, 15, 14 Pro |
| `6.1` | iPhone 14, 13, 12, X, XS, 12 mini, 13 mini |
| `5.5` | iPhone 8 Plus, 7 Plus |
| `4.7` | iPhone SE (3rd/2nd), iPhone 8 |
| `13` | iPad Pro 13", iPad Air 13" |
| `11` | iPad Pro 11", iPad Air 11", iPad mini 6th gen |

**Android** — Categorized by form factor:

| Bucket | Criteria |
|--------|----------|
| `phone` | Shorter screen dimension < 1200px |
| `tablet-7` | Shorter dimension 1200–1799px |
| `tablet-10` | Shorter dimension 1800px+ |

### metadata.json

Tracks which physical device was used for each size bucket:

```json
{
  "ios": {
    "6.9": {
      "device": "iPhone 16 Pro Max",
      "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
      "resolution": "1320x2868"
    }
  },
  "android": {
    "phone": {
      "device": "Pixel 9 Pro",
      "id": "emulator-5554",
      "resolution": "1080x2340"
    }
  }
}
```

## Framing

Both platforms get framed automatically after capture (disable with `--no-frame`).

### iOS — Device bezels

Uses [device-frames-core](https://pypi.org/project/device-frames-core/) to wrap screenshots in realistic Apple device frames (iPhone, iPad). The device model is auto-detected from the screenshot resolution. Requires Python 3 (venv is managed automatically).

### Android — Black frame with rounded corners

Uses ImageMagick to clip the screenshot to rounded corners (overflow hidden) and place it on a black rounded rectangle with uniform padding on all sides. The screenshot and frame share the same border radius. Dimensions scale proportionally:

| Property | Value |
|----------|-------|
| Padding | ~2.5% of image width (equal on all sides) |
| Border radius | ~4% of image width (same for screenshot and frame) |

For a 1080px wide screenshot, this produces ~27px uniform padding with ~43px rounded corners.

## License

MIT
