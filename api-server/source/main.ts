#!/usr/bin/env npx tsx

import "gruber/polyfill.js"; // TODO: this only works with live gruber
import "urlpattern-polyfill";

import process from "node:process";
import yargs from "yargs";
import { dumpConfiguration } from "./config.ts";
import { runMigrations, useAppConfig, useTokens } from "./lib/mod.ts";
import { runServer } from "./server.ts";

const cli = yargs(process.argv.slice(2))
  .help()
  .demandCommand(1, "A command is required")
  .strictCommands();

cli.command(
  "config",
  "dump the current configuration and usage information",
  (yargs) => yargs,
  () => dumpConfiguration(),
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
  ["serve", "start"],
  "run the http server",
  (yargs) => yargs,
  () => runServer(useAppConfig().server),
);

cli.command(
  "dev-auth [user_id]",
  "generate an admin auth token for development",
  (yargs) => yargs.positional("user_id", { type: "number" }),
  async (args) => {
    if (useAppConfig().env !== "development") console.log("not_allowed");
    else console.log(await useTokens().sign("admin", { userId: args.user_id }));
  },
);

try {
  await cli.parseAsync();
} catch (error) {
  console.error("Fatal error:", error);
}
