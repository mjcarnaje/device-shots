import type { DeviceInfo } from "../types.js";
import { commandExists, run, runOrFail } from "../exec.js";

function sanitizeName(name: string): string {
  return name
    .replace(/[ (),]/g, "_")
    .replace(/[^A-Za-z0-9_-]/g, "");
}

export async function discoverIosDevices(
  bundleId: string
): Promise<DeviceInfo[]> {
  if (!(await commandExists("xcrun"))) return [];

  const { stdout } = await run("xcrun", [
    "simctl",
    "list",
    "devices",
    "booted",
    "-j",
  ]);

  if (!stdout) return [];

  const data = JSON.parse(stdout);
  const devices: DeviceInfo[] = [];

  for (const [, deviceList] of Object.entries(
    data.devices as Record<string, Array<{ state: string; udid: string; name: string }>>
  )) {
    for (const d of deviceList) {
      if (d.state !== "Booted") continue;

      // Check if app is installed
      const { stdout: container } = await run("xcrun", [
        "simctl",
        "get_app_container",
        d.udid,
        bundleId,
      ]);

      if (container) {
        devices.push({
          platform: "ios",
          safeName: sanitizeName(d.name),
          captureId: d.udid,
          displayName: d.name,
        });
      }
    }
  }

  return devices;
}

export async function setIosStatusBar(time: string): Promise<void> {
  if (!(await commandExists("xcrun"))) return;

  await run("xcrun", [
    "simctl",
    "status_bar",
    "booted",
    "override",
    "--time",
    time,
    "--batteryState",
    "charged",
    "--batteryLevel",
    "100",
    "--wifiBars",
    "3",
    "--cellularBars",
    "4",
    "--operatorName",
    "",
  ]);
}

export async function clearIosStatusBar(): Promise<void> {
  if (!(await commandExists("xcrun"))) return;
  await run("xcrun", ["simctl", "status_bar", "booted", "clear"]);
}

export async function captureIosScreenshot(
  udid: string,
  outputPath: string
): Promise<boolean> {
  try {
    await runOrFail("xcrun", ["simctl", "io", udid, "screenshot", outputPath]);
    return true;
  } catch {
    return false;
  }
}
