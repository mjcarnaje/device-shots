# device-shots

A CLI tool that captures screenshots from running iOS simulators and Android emulators, then optionally frames iOS screenshots with device bezels. Built for developers who need store-ready screenshots without manual work.

## What it does

1. **Discovers devices** — Finds all running iOS simulators and Android emulators that have your app installed
2. **Cleans up status bars** — Sets a uniform status bar (9:41, full battery, full signal) on all devices before capturing
3. **Captures screenshots** — Takes screenshots from every discovered device in one go
4. **Transparent Android status bar** — Automatically makes the Android status bar area transparent using ImageMagick
5. **Frames iOS screenshots** — Wraps iOS screenshots in device bezels (iPhone/iPad frames) using [device-frames-core](https://pypi.org/project/device-frames-core/)
6. **Organizes output** — Saves everything in a clean folder structure: `screenshots/<platform>/<device>/raw/` and `screenshots/ios/<device>/framed/`

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

- **ImageMagick** — needed to make Android status bars transparent. Install with `brew install imagemagick`
- **Python 3** — needed for iOS screenshot framing. The tool auto-creates a virtual environment at `~/.device-shots/.venv` and installs `device-frames-core` and `Pillow` automatically on first use

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
device-shots capture home -b com.example.myapp -p ios -o ./store-assets

# Skip framing
device-shots capture login -b com.example.myapp --no-frame

# Custom status bar time
device-shots capture checkout -b com.example.myapp --time "10:30"
```

### Frame existing screenshots

```bash
# Frame all unframed iOS screenshots in ./screenshots
device-shots frame

# Frame from a specific directory
device-shots frame ./my-screenshots

# Re-frame everything (overwrite existing framed images)
device-shots frame --force
```

### Initialize config

```bash
device-shots init
```

Creates a `.device-shotsrc.json` in the current directory so you don't have to pass `--bundle-id` every time:

```json
{
  "bundleId": "com.example.myapp",
  "output": "./screenshots",
  "platform": "both",
  "time": "9:41",
  "frame": true
}
```

## Config file

The tool uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig), so you can configure it in any of these ways:

- `.device-shotsrc.json`
- `.device-shotsrc.yaml`
- `.device-shotsrc.js`
- `device-shots.config.js`
- `"device-shots"` key in `package.json`

## Output structure

```
screenshots/
├── ios/
│   ├── iPhone_16_Pro_Max/
│   │   ├── raw/
│   │   │   ├── dashboard_iPhone_16_Pro_Max.png
│   │   │   └── settings_iPhone_16_Pro_Max.png
│   │   └── framed/
│   │       ├── dashboard_iPhone_16_Pro_Max_framed.png
│   │       └── settings_iPhone_16_Pro_Max_framed.png
│   └── iPhone_16/
│       ├── raw/
│       └── framed/
└── android/
    └── Pixel_9_Pro/
        └── raw/
            ├── dashboard_Pixel_9_Pro.png
            └── settings_Pixel_9_Pro.png
```

## License

MIT
