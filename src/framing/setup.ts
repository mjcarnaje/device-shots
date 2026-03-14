import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { run, runOrFail, commandExists } from "../exec.js";

const VENV_DIR = join(homedir(), ".device-shots", ".venv");
const PYTHON_BIN = join(VENV_DIR, "bin", "python3");
const PIP_BIN = join(VENV_DIR, "bin", "pip");

export function getVenvPython(): string {
  return PYTHON_BIN;
}

export function isVenvReady(): boolean {
  return existsSync(PYTHON_BIN);
}

export async function ensureVenv(): Promise<void> {
  if (isVenvReady()) return;

  if (!(await commandExists("python3"))) {
    throw new Error("python3 is required for framing. Please install Python 3.");
  }

  await runOrFail("python3", ["-m", "venv", VENV_DIR]);
  await runOrFail(PIP_BIN, [
    "install",
    "--quiet",
    "device-frames-core",
    "Pillow",
  ]);
}

export async function checkVenvPackages(): Promise<boolean> {
  if (!isVenvReady()) return false;

  const { stdout } = await run(PIP_BIN, ["list", "--format=json"]);
  try {
    const packages = JSON.parse(stdout) as Array<{ name: string }>;
    const names = packages.map((p) => p.name.toLowerCase());
    return (
      names.includes("device-frames-core") && names.includes("pillow")
    );
  } catch {
    return false;
  }
}
