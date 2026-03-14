export interface DeviceInfo {
  platform: "ios" | "android";
  safeName: string;
  captureId: string;
  displayName: string;
}

export interface CapturedFile {
  platform: "ios" | "android";
  safeName: string;
  filename: string;
  tmpPath: string;
}

export interface Config {
  bundleId: string;
  output: string;
  platform: "ios" | "android" | "both";
  time: string;
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
