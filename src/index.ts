import { Command } from "commander";
import { writeFileSync, existsSync } from "node:fs";
import pc from "picocolors";
import prompts from "prompts";
import { captureCommand } from "./commands/capture.js";
import { frameCommand } from "./commands/frame.js";
import { createDefaultConfig } from "./config.js";

const program = new Command();

program
  .name("device-shots")
  .description(
    "Capture and frame mobile app screenshots from iOS simulators and Android emulators"
  )
  .version("0.3.0");

program
  .command("capture")
  .description("Capture screenshots from running devices")
  .argument("[name]", "Screenshot name")
  .option("-b, --bundle-id <id>", "App bundle ID")
  .option("-o, --output <dir>", "Output directory")
  .option("-p, --platform <platform>", "ios, android, or both")
  .option("--no-frame", "Skip framing after capture")
  .option("--time <time>", "Status bar time", "9:41")
  .action(async (name, opts) => {
    await captureCommand({ name, ...opts });
  });

program
  .command("frame")
  .description("Frame existing iOS screenshots with device bezels")
  .argument("[dir]", "Screenshots directory")
  .option("-i, --input <dir>", "Screenshots directory")
  .option("-f, --force", "Re-frame existing screenshots")
  .action(async (dir, opts) => {
    await frameCommand(dir, opts);
  });

program
  .command("init")
  .description("Create a .device-shotsrc.json config file")
  .action(async () => {
    const configPath = ".device-shotsrc.json";

    if (existsSync(configPath)) {
      console.log(pc.yellow(`${configPath} already exists.`));
      return;
    }

    const response = await prompts({
      type: "text",
      name: "bundleId",
      message: "App bundle ID (e.g. com.example.myapp)",
    });

    if (!response.bundleId) {
      console.log("Aborting.");
      return;
    }

    const config = createDefaultConfig(response.bundleId);
    writeFileSync(configPath, config + "\n");
    console.log(pc.green(`Created ${configPath}`));
  });

program.parse();
