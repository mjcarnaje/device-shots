import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import ora from "ora";
import pc from "picocolors";
import prompts from "prompts";
import type {
  CaptureOptions,
  CapturedFile,
  Config,
  DeviceInfo,
  ScreenshotMetadata,
  DeviceMetaEntry,
} from "../types.js";
import { loadConfig } from "../config.js";
import { discoverDevices } from "../devices/discover.js";
import {
  setIosStatusBar,
  clearIosStatusBar,
  captureIosScreenshot,
} from "../devices/ios.js";
import {
  setAndroidDemoMode,
  clearAndroidDemoMode,
  captureAndroidScreenshot,
  makeStatusBarTransparent,
} from "../devices/android.js";
import { frameAllIosScreenshots, frameAllAndroidScreenshots } from "../framing/frame.js";

export async function captureCommand(options: CaptureOptions): Promise<void> {
  const config = await loadConfig();

  const bundleId = options.bundleId || config.bundleId;
  if (!bundleId) {
    console.error(
      pc.red("Bundle ID is required. Use --bundle-id or set it in config.")
    );
    process.exit(1);
  }

  const outputDir = options.output || config.output;
  const platform = options.platform || config.platform;
  const time = options.time || config.time;
  const shouldFrame = !options.noFrame && config.frame;

  // Discover devices
  const spinner = ora("Discovering devices...").start();
  const devices = await discoverDevices(bundleId, platform);
  spinner.stop();

  if (devices.length === 0) {
    console.error(pc.red(`No devices found with ${bundleId} installed.`));
    console.error("Start a simulator/emulator and install the app first.");
    process.exit(1);
  }

  // Show detected devices
  console.log(
    pc.bold(`\nDetected ${devices.length} device(s) with ${bundleId}:`)
  );
  for (const device of devices) {
    const sizeDir = join(outputDir, device.platform, device.screenSize);
    if (existsSync(sizeDir)) {
      const count = readdirSync(sizeDir).filter(
        (f) => f.endsWith(".png") && !f.includes("_framed")
      ).length;
      console.log(
        `  ${pc.dim(device.platform + "/")}${device.screenSize} ${pc.dim("(" + device.displayName + ")")} - ${count} screenshot(s)`
      );
    } else {
      console.log(
        `  ${pc.dim(device.platform + "/")}${device.screenSize} ${pc.dim("(" + device.displayName + ")")} - ${pc.green("new")}`
      );
    }
  }

  // Show existing screenshots
  const existingNames = getExistingScreenshotNames(outputDir, devices);
  if (existingNames.length > 0) {
    console.log(pc.dim("\nExisting screenshots:"));
    for (const name of existingNames) {
      console.log(pc.dim(`  - ${name}`));
    }
  }

  // Get screenshot name
  let screenshotName = options.name;
  if (!screenshotName) {
    const response = await prompts({
      type: "text",
      name: "name",
      message: "Screenshot name (e.g. dashboard, sales-report)",
    });

    if (!response.name) {
      console.log("No name provided. Aborting.");
      process.exit(1);
    }
    screenshotName = response.name;
  }

  // Sanitize name
  screenshotName = screenshotName!
    .replace(/ /g, "-")
    .replace(/[^A-Za-z0-9_-]/g, "");

  // Check for duplicates
  const firstDevice = devices[0];
  const existingFile = join(
    outputDir,
    firstDevice.platform,
    firstDevice.screenSize,
    `${screenshotName}.png`
  );

  if (existsSync(existingFile)) {
    const response = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `Screenshot '${screenshotName}' already exists. Overwrite?`,
      initial: false,
    });

    if (!response.overwrite) {
      console.log("Aborting.");
      process.exit(0);
    }
  }

  // Create temp directory
  const tmpDir = mkdtempSync(join(tmpdir(), "device-shots-"));

  // Set clean status bars
  const iosDevices = devices.filter((d) => d.platform === "ios");
  const androidDevices = devices.filter((d) => d.platform === "android");

  if (iosDevices.length > 0) {
    const s = ora("Setting clean iOS status bar...").start();
    await setIosStatusBar(time);
    s.succeed("iOS status bar set");
  }

  if (androidDevices.length > 0) {
    const s = ora("Setting clean Android status bar...").start();
    for (const device of androidDevices) {
      await setAndroidDemoMode(device.captureId, time);
    }
    s.succeed("Android demo mode set");
  }

  // Capture screenshots
  console.log("");
  const captured: CapturedFile[] = [];

  for (const device of devices) {
    const filename = `${screenshotName}.png`;
    const tmpPath = join(tmpDir, `${device.platform}_${device.screenSize}_${filename}`);
    const icon = device.platform === "ios" ? "iOS" : "Android";
    const s = ora(
      `${icon}: Capturing from ${device.displayName}...`
    ).start();

    let success = false;
    if (device.platform === "ios") {
      success = await captureIosScreenshot(device.captureId, tmpPath);
    } else {
      success = await captureAndroidScreenshot(device.captureId, tmpPath);
      if (success) {
        const transparent = await makeStatusBarTransparent(
          device.captureId,
          tmpPath
        );
        if (transparent) {
          s.text = `${icon}: Captured from ${device.displayName} (status bar transparent)`;
        }
      }
    }

    if (success) {
      captured.push({
        platform: device.platform,
        screenSize: device.screenSize,
        filename,
        tmpPath,
      });
      s.succeed(`${icon}: ${device.screenSize} (${device.displayName})`);
    } else {
      s.fail(`${icon}: Failed to capture from ${device.displayName}`);
    }
  }

  // Move screenshots to output directory
  for (const file of captured) {
    const destDir = join(outputDir, file.platform, file.screenSize);
    mkdirSync(destDir, { recursive: true });
    renameSync(file.tmpPath, join(destDir, file.filename));
  }

  // Update metadata.json
  updateMetadata(outputDir, devices);

  // Restore status bars
  if (iosDevices.length > 0) {
    await clearIosStatusBar();
  }
  for (const device of androidDevices) {
    await clearAndroidDemoMode(device.captureId);
  }

  console.log(
    pc.green(
      `\nCaptured ${captured.length} screenshot(s) as '${screenshotName}'.`
    )
  );

  // Frame screenshots
  if (shouldFrame) {
    if (iosDevices.length > 0) {
      console.log("");
      const s = ora("Framing iOS screenshots...").start();
      try {
        const framed = await frameAllIosScreenshots(outputDir);
        s.succeed(`Framed ${framed} iOS screenshot(s)`);
      } catch (error) {
        s.fail(
          `iOS framing failed: ${error instanceof Error ? error.message : error}`
        );
      }
    }

    if (androidDevices.length > 0) {
      const s = ora("Framing Android screenshots...").start();
      try {
        const framed = await frameAllAndroidScreenshots(outputDir);
        if (framed > 0) {
          s.succeed(`Framed ${framed} Android screenshot(s)`);
        } else {
          s.info("Android framing skipped (ImageMagick not found)");
        }
      } catch (error) {
        s.fail(
          `Android framing failed: ${error instanceof Error ? error.message : error}`
        );
      }
    }
  }
}

function getExistingScreenshotNames(
  outputDir: string,
  devices: DeviceInfo[]
): string[] {
  const names = new Set<string>();

  for (const device of devices) {
    const sizeDir = join(outputDir, device.platform, device.screenSize);
    if (!existsSync(sizeDir)) continue;

    for (const file of readdirSync(sizeDir)) {
      if (!file.endsWith(".png") || file.includes("_framed")) continue;
      names.add(file.replace(".png", ""));
    }
  }

  return [...names].sort();
}

function updateMetadata(
  outputDir: string,
  devices: DeviceInfo[]
): void {
  const metaPath = join(outputDir, "metadata.json");
  let metadata: ScreenshotMetadata = { ios: {}, android: {} };

  if (existsSync(metaPath)) {
    try {
      metadata = JSON.parse(readFileSync(metaPath, "utf-8"));
    } catch {
      // Start fresh
    }
  }

  for (const device of devices) {
    const entry: DeviceMetaEntry = {
      device: device.displayName,
      id: device.captureId,
      resolution: `${device.resolution.width}x${device.resolution.height}`,
    };

    metadata[device.platform][device.screenSize] = entry;
  }

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(metaPath, JSON.stringify(metadata, null, 2) + "\n");
}
