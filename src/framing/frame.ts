import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runOrFail } from "../exec.js";
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
 * Frame all iOS screenshots in the new flat structure.
 *
 * Structure:
 *   .screenshots/ios/6.9/dashboard.png       -> raw
 *   .screenshots/ios/6.9/dashboard_framed.png -> framed (output)
 *
 * frame.py takes a raw dir and a framed dir. In the new structure,
 * both are the same directory — frame.py already outputs *_framed.png
 * and skips files that end with _framed.png.
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

    // In the flat structure, raw and framed live in the same directory
    const { framed } = await frameScreenshots(dirPath, dirPath, force);
    totalFramed += framed;
  }

  return totalFramed;
}
