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
 * rounded corners on both the screenshot and outer frame.
 *
 * The screenshot is clipped to rounded corners (overflow hidden),
 * then placed on a black rounded rectangle with equal padding on
 * all four sides.
 */
export async function frameAndroidScreenshot(
  inputPath: string,
  outputPath: string
): Promise<boolean> {
  if (!(await commandExists("magick"))) {
    throw new Error("ImageMagick is required for Android framing. Install with: brew install imagemagick");
  }

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

  // Uniform padding and corner radius, proportional to image width
  const padding = Math.round(width * 0.025);
  const innerRadius = Math.round(width * 0.04);
  const outerRadius = innerRadius + padding;
  const totalW = width + padding * 2;
  const totalH = height + padding * 2;

  try {
    await runOrFail("magick", [
      // 1. Create black rounded rectangle background (outer frame)
      "-size", `${totalW}x${totalH}`, "xc:none",
      "-draw", `fill black roundrectangle 0,0 ${totalW - 1},${totalH - 1} ${outerRadius},${outerRadius}`,
      // 2. Load screenshot and clip to rounded corners (overflow hidden)
      "(",
        inputPath,
        "-alpha", "set",
        "(", "+clone",
          "-alpha", "extract",
          "-draw", `fill black color 0,0 reset`,
          "-draw", `fill white roundrectangle 0,0 ${width - 1},${height - 1} ${innerRadius},${innerRadius}`,
        ")",
        "-compose", "DstIn", "-composite",
      ")",
      // 3. Place rounded screenshot centered on the black frame
      "-gravity", "center",
      "-compose", "Over",
      "-composite",
      outputPath,
    ]);
    return true;
  } catch {
    return false;
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
