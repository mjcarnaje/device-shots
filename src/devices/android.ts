import type { DeviceInfo } from "../types.js";
import { getAdbPath, run, runOrFail } from "../exec.js";
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

async function adbShell(serial: string, cmd: string): Promise<string> {
  const adb = getAdbPath();
  const { stdout, stderr } = await run(adb, ["-s", serial, "shell", cmd]);
  return stdout || stderr;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function setAndroidDemoMode(
  serial: string,
  time: string = "9:30"
): Promise<void> {
  const hhmm = time.replace(":", "");

  // Enable demo mode
  await adbShell(serial, "settings put global sysui_demo_allowed 1");

  // Enter demo mode
  await adbShell(
    serial,
    "am broadcast -a com.android.systemui.demo -e command enter"
  );

  // Small delay to let demo mode activate
  await sleep(500);

  // Set clock
  await adbShell(
    serial,
    `am broadcast -a com.android.systemui.demo -e command clock -e hhmm ${hhmm}`
  );

  // Set wifi
  await adbShell(
    serial,
    "am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4"
  );

  // Set mobile/cellular
  await adbShell(
    serial,
    "am broadcast -a com.android.systemui.demo -e command network -e mobile show -e datatype none -e level 4"
  );

  // Set battery
  await adbShell(
    serial,
    "am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false"
  );

  // Hide notifications
  await adbShell(
    serial,
    "am broadcast -a com.android.systemui.demo -e command notifications -e visible false"
  );

  // Wait for all changes to render
  await sleep(500);
}

export async function clearAndroidDemoMode(serial: string): Promise<void> {
  await adbShell(
    serial,
    "am broadcast -a com.android.systemui.demo -e command exit"
  );
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
