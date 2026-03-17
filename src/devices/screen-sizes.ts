/**
 * Maps screenshot pixel resolutions to App Store / Play Store size buckets.
 *
 * iOS: resolution comes from `xcrun simctl io <udid> screenshot` (native pixels).
 * Android: resolution comes from `adb shell screencap` (native pixels).
 *
 * Source: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/
 */

// Map "widthxheight" (portrait) -> App Store display size bucket
const IOS_RESOLUTION_MAP: Record<string, string> = {
  // 6.9" — iPhone 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max
  "1320x2868": "6.9",
  "1290x2796": "6.9",
  "1260x2736": "6.9",

  // 6.5" — iPhone 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max, XS Max, XR
  "1284x2778": "6.5",
  "1242x2688": "6.5",

  // 6.3" — iPhone 16 Pro, 16, 15 Pro, 15, 14 Pro
  "1206x2622": "6.3",
  "1179x2556": "6.3",

  // 6.1" — iPhone 14, 13, 13 Pro, 12, 12 Pro, X, XS, 11 Pro, 12 mini, 13 mini
  "1170x2532": "6.1",
  "1125x2436": "6.1",
  "1080x2340": "6.1",

  // 5.5" — iPhone 8 Plus, 7 Plus, 6s Plus
  "1242x2208": "5.5",

  // 4.7" — iPhone SE (3rd/2nd), iPhone 8, 7, 6s
  "750x1334": "4.7",

  // 4.0" — iPhone SE (1st), iPhone 5/5s/5c
  "640x1136": "4.0",
  "640x1096": "4.0",

  // iPad 13" — iPad Pro 13" (M4/M3/M2/M1), iPad Air 13", iPad Pro 12.9" (older)
  "2064x2752": "13",
  "2048x2732": "13",

  // iPad 11" — iPad Pro 11", iPad Air 11", iPad 10th gen, iPad mini 6th gen
  "1488x2266": "11",
  "1668x2420": "11",
  "1668x2388": "11",
  "1640x2360": "11",

  // iPad 10.5" — iPad Pro 10.5", iPad Air 3rd gen, iPad 7th-9th gen
  "1668x2224": "10.5",

  // iPad 9.7" — iPad Pro 9.7", iPad Air 1-2, older iPad mini
  "1536x2048": "9.7",
  "1536x2008": "9.7",
};

export function getIosScreenSize(width: number, height: number): string {
  // Always use portrait orientation (smaller dimension first)
  const w = Math.min(width, height);
  const h = Math.max(width, height);
  return IOS_RESOLUTION_MAP[`${w}x${h}`] ?? `${w}x${h}`;
}

// Map "widthxheight" (portrait) -> Play Store display category
const ANDROID_RESOLUTION_MAP: Record<string, string> = {
  // Phones — Pixel series
  "1080x2400": "phone", // Pixel 9, 8, 7, 6
  "1344x2992": "phone", // Pixel 8 Pro, Pixel 9 Pro XL
  "1280x2856": "phone", // Pixel 9 Pro
  "1440x3120": "phone", // Pixel 7 Pro, 6 Pro, Samsung Galaxy S24 Ultra
  "1080x2340": "phone", // Pixel 5, Samsung Galaxy S24, S23
  "1080x2310": "phone", // Pixel 4a, 5a
  "1080x2280": "phone", // Pixel 4
  "1080x1920": "phone", // Pixel (1st gen), Nexus 5X, many older phones

  // Phones — Samsung Galaxy series
  "1440x3200": "phone", // Samsung Galaxy S22 Ultra, S21 Ultra
  "1440x2960": "phone", // Samsung Galaxy S9, S8

  // 7" tablets
  "1200x1920": "tablet-7", // Nexus 7 (2013), Android Studio "Medium Tablet" AVD
  "800x1280": "tablet-7", // Nexus 7 (2012)

  // 10" tablets
  "1600x2560": "tablet-10", // Pixel Tablet, Samsung Galaxy Tab S series
  "1200x2000": "tablet-10", // Samsung Galaxy Tab A8
};

export function getAndroidScreenSize(
  width: number,
  height: number
): string {
  // Always use portrait orientation (smaller dimension first)
  const w = Math.min(width, height);
  const h = Math.max(width, height);

  const mapped = ANDROID_RESOLUTION_MAP[`${w}x${h}`];
  if (mapped) return mapped;

  // Fallback: classify by aspect ratio and shorter dimension
  const ratio = h / w;
  if (ratio >= 1.7) return "phone";
  if (w >= 1500) return "tablet-10";
  if (w >= 1200) return "tablet-7";
  return "phone";
}
