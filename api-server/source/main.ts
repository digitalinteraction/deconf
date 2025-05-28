#!/usr/bin/env npx tsx

import "gruber/polyfill.js"; // TODO: this only works with live gruber
import "urlpattern-polyfill";

import process from "node:process";
import yargs from "yargs";
import { dumpConfig } from "./config.js";
import { runMigrations, useAppConfig } from "./lib/mod.js";
import { runServer } from "./server.js";

const cli = yargs(process.argv.slice(2))
  .help()
  .demandCommand(1, "A command is required")
  .strictCommands();

cli.command(
  "config",
  "dump the current configuration and usage information",
  (yargs) => yargs,
  (args) => dumpConfig(),
);

cli.command(
  "migrate <dir>",
  "run database migrations",
  (yargs) =>
    yargs.positional("dir", {
      type: "string",
      choices: ["up", "down"],
      demandOption: true,
    }),
  async (args) => runMigrations(args.dir),
);

cli.command(
  "serve",
  "run the http server",
  (yargs) => yargs,
  (args) => runServer(useAppConfig().server),
);

// more commands ...

try {
  await cli.parseAsync();
} catch (error) {
  console.error("Fatal error:", error);
}
