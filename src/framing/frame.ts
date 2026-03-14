import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { commandExists, run, runOrFail } from "../exec.js";
import { ensureVenv, getVenvPython } from "./setup.js";

function getFramePyPath(): string {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(thisDir, "..", "vendor", "frame.py"),
    join(thisDir, "..", "..", "vendor", "frame.py"),
  ];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  throw new Error(
    "Could not find vendored frame.py. Ensure the vendor/ directory is present."
  );
}

export async function frameScreenshots(
  inputDir: string,
  outputDir: string,
  force: boolean = false
): Promise<{ framed: number; skipped: number }> {
  await ensureVenv();

  const framePy = getFramePyPath();
  const python = getVenvPython();

  const args = [framePy, inputDir, outputDir];
  if (force) {
    args.push("--force");
  }

  const output = await runOrFail(python, args);
  if (output) {
    process.stdout.write(output + "\n");
  }

  const framedFiles = existsSync(outputDir)
    ? readdirSync(outputDir).filter((f) => f.endsWith(".png")).length
    : 0;
  const rawFiles = existsSync(inputDir)
    ? readdirSync(inputDir).filter((f) => f.endsWith(".png")).length
    : 0;

  return { framed: framedFiles, skipped: rawFiles - framedFiles };
}

/**
 * Frame a single Android screenshot with uniform black padding and
 * rounded corners.
 *
 * Both the screenshot and the outer frame use the same border radius.
 * Uses a three-step process with explicit mask files for reliability:
 * 1. Create a rounded-rect mask
 * 2. Apply mask to screenshot (clip corners)
 * 3. Place rounded screenshot on black rounded-rect background
 */
export async function frameAndroidScreenshot(
  inputPath: string,
  outputPath: string
): Promise<boolean> {
  if (!(await commandExists("magick"))) {
    throw new Error("ImageMagick is required for Android framing. Install with: brew install imagemagick");
  }

  const { unlinkSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");

  // Get image dimensions
  const { stdout: identify } = await run("magick", [
    "identify",
    "-format",
    "%wx%h",
    inputPath,
  ]);
  const match = identify.match(/(\d+)x(\d+)/);
  if (!match) return false;

  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);

  // Fixed pixel values so all device sizes look consistent
  const padding = 30;
  const innerRadius = 60;
  const outerRadius = innerRadius + padding;
  const totalW = width + padding * 2;
  const totalH = height + padding * 2;

  const uid = Date.now();
  const tmpMask = join(tmpdir(), `ds-mask-${uid}.png`);
  const tmpRounded = join(tmpdir(), `ds-rounded-${uid}.png`);

  try {
    // Step 1: Create a white rounded-rect mask on black background
    await runOrFail("magick", [
      "-size", `${width}x${height}`,
      "xc:black",
      "-fill", "white",
      "-draw", `roundrectangle 0,0 ${width - 1},${height - 1} ${innerRadius},${innerRadius}`,
      tmpMask,
    ]);

    // Step 2: Apply mask to screenshot — clips corners (overflow hidden)
    await runOrFail("magick", [
      inputPath,
      tmpMask,
      "-alpha", "off",
      "-compose", "CopyOpacity",
      "-composite",
      tmpRounded,
    ]);

    // Step 3: Create black rounded-rect background, composite rounded screenshot on top
    await runOrFail("magick", [
      "-size", `${totalW}x${totalH}`,
      "xc:none",
      "-fill", "black",
      "-draw", `roundrectangle 0,0 ${totalW - 1},${totalH - 1} ${outerRadius},${outerRadius}`,
      tmpRounded,
      "-gravity", "center",
      "-compose", "Over",
      "-composite",
      outputPath,
    ]);

    return true;
  } catch {
    return false;
  } finally {
    try { unlinkSync(tmpMask); } catch {}
    try { unlinkSync(tmpRounded); } catch {}
  }
}

/**
 * Frame all iOS screenshots in the flat structure.
 */
export async function frameAllIosScreenshots(
  screenshotsDir: string,
  force: boolean = false
): Promise<number> {
  const iosDir = join(screenshotsDir, "ios");
  if (!existsSync(iosDir)) return 0;

  let totalFramed = 0;
  const sizeDirs = readdirSync(iosDir, { withFileTypes: true }).filter(
    (d) => d.isDirectory()
  );

  for (const sizeDir of sizeDirs) {
    const dirPath = join(iosDir, sizeDir.name);

    const pngFiles = readdirSync(dirPath).filter(
      (f) => f.endsWith(".png") && !f.includes("_framed")
    );
    if (pngFiles.length === 0) continue;

    const { framed } = await frameScreenshots(dirPath, dirPath, force);
    totalFramed += framed;
  }

  return totalFramed;
}

/**
 * Frame all Android screenshots with black border + rounded corners.
 */
export async function frameAllAndroidScreenshots(
  screenshotsDir: string,
  force: boolean = false
): Promise<number> {
  if (!(await commandExists("magick"))) return 0;

  const androidDir = join(screenshotsDir, "android");
  if (!existsSync(androidDir)) return 0;

  let totalFramed = 0;
  const sizeDirs = readdirSync(androidDir, { withFileTypes: true }).filter(
    (d) => d.isDirectory()
  );

  for (const sizeDir of sizeDirs) {
    const dirPath = join(androidDir, sizeDir.name);

    const rawFiles = readdirSync(dirPath).filter(
      (f) => f.endsWith(".png") && !f.includes("_framed")
    );

    for (const file of rawFiles) {
      const inputPath = join(dirPath, file);
      const outputPath = join(dirPath, file.replace(".png", "_framed.png"));

      if (!force && existsSync(outputPath)) continue;

      const success = await frameAndroidScreenshot(inputPath, outputPath);
      if (success) totalFramed++;
    }
  }

  return totalFramed;
}
