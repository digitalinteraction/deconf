#!/usr/bin/env npx tsx

import 'urlpattern-polyfill'
import process from 'node:process'
import yargs from 'yargs'
import { appConfig, dumpConfig } from './config.js'
import { runMigrations } from './lib/mod.js'
import { runServer } from './server.js'

const cli = yargs(process.argv.slice(2))
  .help()
  .demandCommand(1, 'A command is required')
  .strictCommands()

cli.command(
  'config',
  'dump the current configuration and usage information',
  (yargs) => yargs,
  (args) => dumpConfig(),
)

cli.command(
  'migrate <dir>',
  'run database migrations',
  (yargs) =>
    yargs.positional('dir', {
      type: 'string',
      choices: ['up', 'down'],
      demandOption: true,
    }),
  async (args) => runMigrations(args.dir),
)

cli.command(
  'serve',
  'run the http server',
  (yargs) => yargs,
  (args) => runServer(appConfig.server),
)

// more commands ...

try {
  await cli.parseAsync()
} catch (error) {
  console.error('Fatal error:', error)
}
