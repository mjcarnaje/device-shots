import ora from "ora";
import pc from "picocolors";
import type { FrameOptions } from "../types.js";
import { loadConfig } from "../config.js";
import { frameAllIosScreenshots, frameAllAndroidScreenshots } from "../framing/frame.js";

export async function frameCommand(
  dir: string | undefined,
  options: FrameOptions
): Promise<void> {
  const config = await loadConfig();
  const screenshotsDir = dir || options.input || config.output;

  console.log(pc.bold(`Framing screenshots in ${screenshotsDir}...`));

  // Frame iOS
  const iosSpinner = ora("Framing iOS screenshots (device bezels)...").start();
  try {
    const framed = await frameAllIosScreenshots(screenshotsDir, options.force);
    if (framed > 0) {
      iosSpinner.succeed(`Framed ${framed} iOS screenshot(s)`);
    } else {
      iosSpinner.info("No new iOS screenshots to frame");
    }
  } catch (error) {
    iosSpinner.fail(
      `iOS framing failed: ${error instanceof Error ? error.message : error}`
    );
  }

  // Frame Android
  const androidSpinner = ora("Framing Android screenshots (black border)...").start();
  try {
    const framed = await frameAllAndroidScreenshots(screenshotsDir, options.force);
    if (framed > 0) {
      androidSpinner.succeed(`Framed ${framed} Android screenshot(s)`);
    } else {
      androidSpinner.info("No new Android screenshots to frame");
    }
  } catch (error) {
    androidSpinner.fail(
      `Android framing failed: ${error instanceof Error ? error.message : error}`
    );
  }
}
