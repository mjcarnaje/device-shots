import ora from "ora";
import pc from "picocolors";
import type { FrameOptions } from "../types.js";
import { loadConfig } from "../config.js";
import { frameAllIosScreenshots } from "../framing/frame.js";

export async function frameCommand(
  dir: string | undefined,
  options: FrameOptions
): Promise<void> {
  const config = await loadConfig();
  const screenshotsDir = dir || options.input || config.output;

  console.log(pc.bold(`Framing iOS screenshots in ${screenshotsDir}...`));

  const spinner = ora("Setting up Python environment...").start();
  try {
    const framed = await frameAllIosScreenshots(
      screenshotsDir,
      options.force
    );
    if (framed > 0) {
      spinner.succeed(`Framed ${framed} screenshot(s)`);
    } else {
      spinner.info("No new screenshots to frame");
    }
  } catch (error) {
    spinner.fail(
      `Framing failed: ${error instanceof Error ? error.message : error}`
    );
    process.exit(1);
  }
}
