/**
 * Maps screenshot pixel resolutions to App Store / Play Store size buckets.
 *
 * iOS: resolution comes from `xcrun simctl io <udid> screenshot` (native pixels).
 * Android: resolution comes from `adb shell screencap` (native pixels).
 */

// Map "widthxheight" -> App Store display size bucket
const IOS_RESOLUTION_MAP: Record<string, string> = {
  // 6.9" — iPhone 16 Pro Max
  "1320x2868": "6.9",

  // 6.7" — iPhone 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max
  "1290x2796": "6.7",

  // 6.5" — iPhone 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max
  "1284x2778": "6.5",
  "1242x2688": "6.5",

  // 6.3" — iPhone 16 Pro
  "1206x2622": "6.3",

  // 6.1" — iPhone 16, 15, 15 Pro, 14, 14 Pro, 13, 13 Pro, 12, 12 Pro
  "1179x2556": "6.1",
  "1170x2532": "6.1",

  // 5.8" — iPhone X, XS, 11 Pro
  "1125x2436": "5.8",

  // 5.5" — iPhone 8 Plus, 7 Plus, 6s Plus
  "1242x2208": "5.5",

  // 4.7" — iPhone SE (3rd/2nd), iPhone 8, 7, 6s
  "750x1334": "4.7",

  // iPad 13" — iPad Pro 13" (M4), iPad Pro 12.9" (older)
  "2064x2752": "13",
  "2048x2732": "13",

  // iPad 11" — iPad Pro 11", iPad Air
  "1668x2388": "11",
  "1668x2224": "11",
  "1640x2360": "11",

  // iPad 10.9" — iPad Air (5th), iPad (10th)
  "2360x1640": "11",

  // iPad mini
  "1488x2266": "8.3",
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

  if (shorter >= 1800) return "tablet-10";
  if (shorter >= 1200) return "tablet-7";
  return "phone";
}
