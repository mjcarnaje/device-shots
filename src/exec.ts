import { execa, type Options as ExecaOptions } from "execa";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

let cachedAdbPath: string | null = null;

export function getAdbPath(): string {
  if (cachedAdbPath) return cachedAdbPath;

  const androidHome =
    process.env.ANDROID_HOME || join(homedir(), "Library", "Android", "sdk");
  const adbPath = join(androidHome, "platform-tools", "adb");

  if (existsSync(adbPath)) {
    cachedAdbPath = adbPath;
    return adbPath;
  }

  // Fallback to PATH
  cachedAdbPath = "adb";
  return "adb";
}

export async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execa("which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

export async function run(
  cmd: string,
  args: string[],
  options?: ExecaOptions
): Promise<{ stdout: string; stderr: string }> {
  const result = await execa(cmd, args, {
    reject: false,
    ...options,
  });
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export async function runOrFail(
  cmd: string,
  args: string[],
  options?: ExecaOptions
): Promise<string> {
  const result = await execa(cmd, args, options);
  return result.stdout ?? "";
}
