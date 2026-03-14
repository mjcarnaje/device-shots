import type { DeviceInfo } from "../types.js";
import { discoverIosDevices } from "./ios.js";
import { discoverAndroidDevices } from "./android.js";

export async function discoverDevices(
  bundleId: string,
  platform: "ios" | "android" | "both" = "both"
): Promise<DeviceInfo[]> {
  const results: DeviceInfo[] = [];

  if (platform === "ios" || platform === "both") {
    const iosDevices = await discoverIosDevices(bundleId);
    results.push(...iosDevices);
  }

  if (platform === "android" || platform === "both") {
    const androidDevices = await discoverAndroidDevices(bundleId);
    results.push(...androidDevices);
  }

  return results;
}
