import type { DeviceInfo } from "../types.js";
import { discoverIosDevices } from "./ios.js";
import { discoverAndroidDevices } from "./android.js";

/**
 * Discover devices with the app installed.
 * Accepts a single bundle ID or an array (e.g. production + dev).
 * When given an array, tries each ID per device and uses the first match.
 */
export async function discoverDevices(
  bundleId: string | string[],
  platform: "ios" | "android" | "both" = "both"
): Promise<DeviceInfo[]> {
  const ids = Array.isArray(bundleId) ? bundleId : [bundleId];
  const results: DeviceInfo[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (platform === "ios" || platform === "both") {
      const iosDevices = await discoverIosDevices(id);
      for (const d of iosDevices) {
        if (!seen.has(d.captureId)) {
          seen.add(d.captureId);
          results.push(d);
        }
      }
    }

    if (platform === "android" || platform === "both") {
      const androidDevices = await discoverAndroidDevices(id);
      for (const d of androidDevices) {
        if (!seen.has(d.captureId)) {
          seen.add(d.captureId);
          results.push(d);
        }
      }
    }
  }

  return results;
}
