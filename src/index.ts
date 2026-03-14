import { Command } from "commander";
import { writeFileSync, existsSync, rmSync } from "node:fs";
import pc from "picocolors";
import prompts from "prompts";
import { captureCommand } from "./commands/capture.js";
import { frameCommand } from "./commands/frame.js";
import { createDefaultConfig, loadConfig } from "./config.js";

const program = new Command();

program
  .name("device-shots")
  .description(
    "Capture and frame mobile app screenshots from iOS simulators and Android emulators"
  )
  .version("0.5.2");

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
  .description("Frame existing screenshots with device bezels or borders")
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

    const response = await prompts([
      {
        type: "text",
        name: "bundleId",
        message: "Production bundle ID (e.g. com.example.myapp)",
      },
      {
        type: "text",
        name: "devBundleId",
        message: "Dev bundle ID (leave empty to skip)",
      },
    ]);

    if (!response.bundleId) {
      console.log("Aborting.");
      return;
    }

    const bundleId = response.devBundleId
      ? [response.bundleId, response.devBundleId]
      : response.bundleId;
    const config = createDefaultConfig(bundleId);
    writeFileSync(configPath, config + "\n");
    console.log(pc.green(`Created ${configPath}`));
  });

program
  .command("clean")
  .description("Delete all screenshots and metadata")
  .option("-o, --output <dir>", "Screenshots directory to clean")
  .option("-y, --yes", "Skip confirmation")
  .action(async (opts) => {
    const config = await loadConfig();
    const outputDir = opts.output || config.output;

    if (!existsSync(outputDir)) {
      console.log(pc.dim(`Nothing to clean — ${outputDir} does not exist.`));
      return;
    }

    if (!opts.yes) {
      const response = await prompts({
        type: "confirm",
        name: "confirm",
        message: `Delete everything in ${outputDir}?`,
        initial: false,
      });

      if (!response.confirm) {
        console.log("Aborting.");
        return;
      }
    }

    rmSync(outputDir, { recursive: true, force: true });
    console.log(pc.green(`Cleaned ${outputDir}`));
  });

program.parse();
