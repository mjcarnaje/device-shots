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

export function getAndroidScreenSize(
  width: number,
  height: number
): string {
  const shorter = Math.min(width, height);
  const longer = Math.max(width, height);
  const ratio = longer / shorter;

  // Phones have tall aspect ratios (>= 1.7), tablets are squarer (< 1.7)
  if (ratio >= 1.7) return "phone";
  if (shorter >= 1800) return "tablet-10";
  if (shorter >= 1200) return "tablet-7";
  return "phone";
}
