import { cosmiconfig } from "cosmiconfig";
import type { Config } from "./types.js";

const MODULE_NAME = "device-shots";

const DEFAULTS: Config = {
  bundleId: "",
  output: "./screenshots",
  platform: "both",
  time: "9:41",
  frame: true,
};

export async function loadConfig(): Promise<Config> {
  const explorer = cosmiconfig(MODULE_NAME);

  try {
    const result = await explorer.search();
    if (result && result.config) {
      return { ...DEFAULTS, ...result.config };
    }
  } catch {
    // Config file not found or invalid, use defaults
  }

  return DEFAULTS;
}

export function createDefaultConfig(bundleId: string): string {
  return JSON.stringify(
    {
      bundleId,
      output: "./screenshots",
      platform: "both",
      time: "9:41",
      frame: true,
    },
    null,
    2
  );
}
