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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function adbExec(serial: string, args: string[]): Promise<string> {
  const adb = getAdbPath();
  const { stdout, stderr } = await run(adb, ["-s", serial, ...args]);
  return stdout || stderr;
}

async function demoBroadcast(serial: string, extras: string): Promise<string> {
  const adb = getAdbPath();
  // Use sh -c to ensure the full command is interpreted as one shell command
  const cmd = `am broadcast -a com.android.systemui.demo ${extras}`;
  const { stdout, stderr } = await run(adb, ["-s", serial, "shell", "sh", "-c", cmd]);
  return stdout || stderr;
}

export async function setAndroidDemoMode(
  serial: string,
  time: string = "9:30"
): Promise<void> {
  const hhmm = time.replace(":", "");
  const adb = getAdbPath();

  // Enable demo mode via both settings (covers old + new Android)
  await run(adb, ["-s", serial, "shell", "settings", "put", "global", "sysui_demo_allowed", "1"]);
  await run(adb, ["-s", serial, "shell", "settings", "put", "global", "sysui_tuner_demo_on", "1"]);
  await sleep(500);

  // Enter demo mode
  let result = await demoBroadcast(serial, "-e command enter");
  process.stderr.write(`[demo] enter: ${result.trim()}\n`);
  await sleep(1000);

  // Set clock
  result = await demoBroadcast(serial, `-e command clock -e hhmm ${hhmm}`);
  process.stderr.write(`[demo] clock: ${result.trim()}\n`);
  await sleep(300);

  // Set wifi
  result = await demoBroadcast(serial, "-e command network -e wifi show -e level 4");
  process.stderr.write(`[demo] wifi: ${result.trim()}\n`);
  await sleep(300);

  // Set mobile/cellular
  result = await demoBroadcast(serial, "-e command network -e mobile show -e datatype none -e level 4");
  process.stderr.write(`[demo] mobile: ${result.trim()}\n`);
  await sleep(300);

  // Set battery
  result = await demoBroadcast(serial, "-e command battery -e level 100 -e plugged false");
  process.stderr.write(`[demo] battery: ${result.trim()}\n`);
  await sleep(300);

  // Hide notifications
  result = await demoBroadcast(serial, "-e command notifications -e visible false");
  process.stderr.write(`[demo] notif: ${result.trim()}\n`);

  // Wait for UI to render
  await sleep(1000);
}

export async function clearAndroidDemoMode(serial: string): Promise<void> {
  await demoBroadcast(serial, "-e command exit");
  const adb = getAdbPath();
  await run(adb, ["-s", serial, "shell", "settings", "put", "global", "sysui_tuner_demo_on", "0"]);
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
