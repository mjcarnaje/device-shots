import type { DeviceInfo } from "../types.js";
import { commandExists, run, runOrFail } from "../exec.js";
import { getIosScreenSize } from "./screen-sizes.js";

function sanitizeName(name: string): string {
  return name
    .replace(/[ (),]/g, "_")
    .replace(/[^A-Za-z0-9_-]/g, "");
}

interface SimDeviceAppearance {
  width: number;
  height: number;
}

async function getSimulatorResolution(
  udid: string
): Promise<{ width: number; height: number } | null> {
  // Use simctl to get device display info via io enumerate
  const { stdout } = await run("xcrun", [
    "simctl",
    "io",
    udid,
    "enumerate",
  ]);

  // Parse resolution from enumerate output — looks for mainScreenScale and size
  // Fallback: capture a tiny screenshot and read its dimensions
  if (!stdout) return null;

  // Try to extract from the enumerate output
  const scaleMatch = stdout.match(/mainScreenScale\s*[:=]\s*([\d.]+)/);
  const widthMatch = stdout.match(/width\s*[:=]\s*(\d+)/);
  const heightMatch = stdout.match(/height\s*[:=]\s*(\d+)/);

  if (widthMatch && heightMatch) {
    const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    return {
      width: parseInt(widthMatch[1], 10) * scale,
      height: parseInt(heightMatch[1], 10) * scale,
    };
  }

  return null;
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
    data.devices as Record<
      string,
      Array<{ state: string; udid: string; name: string }>
    >
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
        // Get resolution by taking a test screenshot to /dev/null and reading dimensions
        // This is the most reliable way since simctl doesn't expose resolution directly
        const resolution = await getResolutionViaTestCapture(d.udid);
        const screenSize = resolution
          ? getIosScreenSize(resolution.width, resolution.height)
          : sanitizeName(d.name);

        devices.push({
          platform: "ios",
          safeName: sanitizeName(d.name),
          captureId: d.udid,
          displayName: d.name,
          screenSize,
          resolution: resolution ?? { width: 0, height: 0 },
        });
      }
    }
  }

  return devices;
}

async function getResolutionViaTestCapture(
  udid: string
): Promise<{ width: number; height: number } | null> {
  try {
    const tmpPath = `/tmp/device-shots-probe-${udid}.png`;
    await runOrFail("xcrun", ["simctl", "io", udid, "screenshot", tmpPath]);

    if (await commandExists("magick")) {
      const { stdout } = await run("magick", [
        "identify",
        "-format",
        "%wx%h",
        tmpPath,
      ]);
      const match = stdout.match(/(\d+)x(\d+)/);
      // Clean up
      await run("rm", ["-f", tmpPath]);
      if (match) {
        return {
          width: parseInt(match[1], 10),
          height: parseInt(match[2], 10),
        };
      }
    } else {
      // Try sips (macOS built-in)
      const { stdout } = await run("sips", [
        "-g",
        "pixelWidth",
        "-g",
        "pixelHeight",
        tmpPath,
      ]);
      await run("rm", ["-f", tmpPath]);
      const wMatch = stdout.match(/pixelWidth:\s*(\d+)/);
      const hMatch = stdout.match(/pixelHeight:\s*(\d+)/);
      if (wMatch && hMatch) {
        return {
          width: parseInt(wMatch[1], 10),
          height: parseInt(hMatch[1], 10),
        };
      }
    }

    await run("rm", ["-f", tmpPath]);
  } catch {
    // Ignore
  }
  return null;
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
