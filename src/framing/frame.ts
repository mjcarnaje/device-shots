import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runOrFail } from "../exec.js";
import { ensureVenv, getVenvPython } from "./setup.js";

function getFramePyPath(): string {
  // Resolve relative to this file -> ../../vendor/frame.py
  const thisDir = dirname(fileURLToPath(import.meta.url));
  // In dist, this file is at dist/index.js (bundled), so vendor is at ../vendor
  // Try multiple possible locations
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
  rawDir: string,
  framedDir: string,
  force: boolean = false
): Promise<{ framed: number; skipped: number }> {
  await ensureVenv();

  const framePy = getFramePyPath();
  const python = getVenvPython();

  const args = [framePy, rawDir, framedDir];
  if (force) {
    args.push("--force");
  }

  const output = await runOrFail(python, args);
  if (output) {
    process.stdout.write(output + "\n");
  }

  // Count results
  const framedFiles = existsSync(framedDir)
    ? readdirSync(framedDir).filter((f) => f.endsWith(".png")).length
    : 0;
  const rawFiles = existsSync(rawDir)
    ? readdirSync(rawDir).filter((f) => f.endsWith(".png")).length
    : 0;

  return { framed: framedFiles, skipped: rawFiles - framedFiles };
}

export async function frameAllIosScreenshots(
  screenshotsDir: string,
  force: boolean = false
): Promise<number> {
  const iosDir = join(screenshotsDir, "ios");
  if (!existsSync(iosDir)) return 0;

  let totalFramed = 0;
  const deviceDirs = readdirSync(iosDir, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const deviceDir of deviceDirs) {
    const rawDir = join(iosDir, deviceDir.name, "raw");
    if (!existsSync(rawDir)) continue;

    const pngFiles = readdirSync(rawDir).filter((f) => f.endsWith(".png"));
    if (pngFiles.length === 0) continue;

    const framedDir = join(iosDir, deviceDir.name, "framed");
    const { framed } = await frameScreenshots(rawDir, framedDir, force);
    totalFramed += framed;
  }

  return totalFramed;
}
