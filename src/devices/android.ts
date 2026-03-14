import type { DeviceInfo } from "../types.js";
import { commandExists, getAdbPath, run, runOrFail } from "../exec.js";
import { getAndroidScreenSize } from "./screen-sizes.js";

function sanitizeName(name: string): string {
  return name
    .replace(/[ (),]/g, "_")
    .replace(/[^A-Za-z0-9_-]/g, "");
}

async function getAndroidResolution(
  serial: string
): Promise<{ width: number; height: number } | null> {
  const adb = getAdbPath();
  const { stdout } = await run(adb, ["-s", serial, "shell", "wm", "size"]);
  const match = stdout.match(/(\d+)x(\d+)/);
  if (!match) return null;
  return {
    width: parseInt(match[1], 10),
    height: parseInt(match[2], 10),
  };
}

export async function discoverAndroidDevices(
  bundleId: string
): Promise<DeviceInfo[]> {
  const adb = getAdbPath();
  const { stdout } = await run(adb, ["devices"]);

  if (!stdout) return [];

  const devices: DeviceInfo[] = [];
  const lines = stdout.split("\n").slice(1); // Skip header

  for (const line of lines) {
    const match = line.match(/^(\S+)\s+device$/);
    if (!match) continue;

    const serial = match[1];

    // Check if app is installed
    const { stdout: pmPath } = await run(adb, [
      "-s",
      serial,
      "shell",
      "pm",
      "path",
      bundleId,
    ]);

    if (!pmPath) continue;

    // Get device name
    let avdName = "";
    const { stdout: emuName } = await run(adb, [
      "-s",
      serial,
      "emu",
      "avd",
      "name",
    ]);
    avdName = emuName.split("\n")[0].trim();

    if (!avdName) {
      const { stdout: model } = await run(adb, [
        "-s",
        serial,
        "shell",
        "getprop",
        "ro.product.model",
      ]);
      avdName = model.trim();
    }

    const safeName = sanitizeName(avdName) || serial;
    const resolution = await getAndroidResolution(serial);
    const screenSize = resolution
      ? getAndroidScreenSize(resolution.width, resolution.height)
      : "phone";

    devices.push({
      platform: "android",
      safeName,
      captureId: serial,
      displayName: avdName || serial,
      screenSize,
      resolution: resolution ?? { width: 0, height: 0 },
    });
  }

  return devices;
}

export async function setAndroidDemoMode(
  serial: string,
  time: string
): Promise<void> {
  const adb = getAdbPath();
  const hhmm = time.replace(":", "");

  const commands = [
    ["settings", "put", "global", "sysui_demo_allowed", "1"],
    ["am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "enter"],
    ["am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "clock", "-e", "hhmm", hhmm],
    ["am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "wifi", "-e", "fully", "true"],
    ["am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "battery", "-e", "level", "100", "-e", "plugged", "false"],
    ["am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "notifications", "-e", "visible", "false"],
  ];

  for (const cmd of commands) {
    await run(adb, ["-s", serial, "shell", ...cmd]);
  }
}

export async function clearAndroidDemoMode(serial: string): Promise<void> {
  const adb = getAdbPath();
  await run(adb, [
    "-s",
    serial,
    "shell",
    "am",
    "broadcast",
    "-a",
    "com.android.systemui.demo",
    "-e",
    "command",
    "exit",
  ]);
}

export async function captureAndroidScreenshot(
  serial: string,
  outputPath: string
): Promise<boolean> {
  const adb = getAdbPath();
  const deviceTmp = "/sdcard/screenshot_tmp.png";

  try {
    await runOrFail(adb, ["-s", serial, "shell", "screencap", deviceTmp]);
    await runOrFail(adb, ["-s", serial, "pull", deviceTmp, outputPath]);
    await run(adb, ["-s", serial, "shell", "rm", deviceTmp]);
    return true;
  } catch {
    return false;
  }
}

export async function makeStatusBarTransparent(
  serial: string,
  imagePath: string
): Promise<boolean> {
  if (!(await commandExists("magick"))) return false;

  const adb = getAdbPath();
  const STATUS_BAR_HEIGHT_DP = 24;

  const { stdout: densityOutput } = await run(adb, [
    "-s",
    serial,
    "shell",
    "wm",
    "density",
  ]);

  const densityMatch = densityOutput.match(/(\d+)\s*$/m);
  if (!densityMatch) return false;

  const density = parseInt(densityMatch[1], 10);
  const statusBarPx = Math.ceil((STATUS_BAR_HEIGHT_DP * density) / 160);

  const { stdout: identify } = await run("magick", [
    "identify",
    "-format",
    "%w",
    imagePath,
  ]);

  const imgWidth = identify.trim();
  if (!imgWidth) return false;

  try {
    await runOrFail("magick", [
      imagePath,
      "-region",
      `${imgWidth}x${statusBarPx}+0+0`,
      "-alpha",
      "set",
      "-channel",
      "A",
      "-evaluate",
      "set",
      "0",
      "+channel",
      imagePath,
    ]);
    return true;
  } catch {
    return false;
  }
}
