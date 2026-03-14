export interface DeviceInfo {
  platform: "ios" | "android";
  safeName: string;
  captureId: string;
  displayName: string;
  screenSize: string; // e.g. "6.9", "6.7", "phone", "7-inch-tablet"
  resolution: { width: number; height: number };
}

export interface CapturedFile {
  platform: "ios" | "android";
  screenSize: string;
  filename: string;
  tmpPath: string;
}

export interface ScreenshotMetadata {
  ios: Record<string, DeviceMetaEntry>;
  android: Record<string, DeviceMetaEntry>;
}

export interface DeviceMetaEntry {
  device: string;
  id: string;
  resolution: string;
}

export interface Config {
  bundleId: string | string[];
  output: string;
  platform: "ios" | "android" | "both";
  time: string;
  androidTime: string;
  frame: boolean;
}

export interface CaptureOptions {
  name?: string;
  bundleId?: string;
  output?: string;
  platform?: "ios" | "android" | "both";
  noFrame?: boolean;
  time?: string;
}

export interface FrameOptions {
  input?: string;
  force?: boolean;
}
