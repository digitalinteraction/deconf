#!/usr/bin/env node

import process from 'node:process'

import 'dotenv/config'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { createTerminus } from '@godaddy/terminus'

import { createDebug } from './source/lib.js'
import { appConfig } from './source/config.js'
import { createServer } from './source/server.js'
import { createAnalytics } from './source/analytics.js'

const debug = createDebug('cli')

const cli = yargs(hideBin(process.argv))
  .help()
  .demandCommand(1, 'A command is required')
  .recommendCommands()

cli.command(
  'serve',
  'Run the server',
  (yargs) => yargs.option('port', { default: 3000 }),
  (args) => {
    const { server, disposables } = createServer()

    server.listen(args.port, () => {
      debug('listening on http://0.0.0.0:%d', args.port)
    })

    createTerminus(server, {
      signals: ['SIGINT', 'SIGTERM'],
      healthChecks: {
        '/healthz': async () => 'ok',
      },
      beforeShutdown() {
        const wait = appConfig.env !== 'development' ? 5000 : 0
        return new Promise((resolve) => setTimeout(resolve, wait))
      },
      async onSignal() {
        await disposables.dispose()
      },
    })
  }
)

cli.command(
  'analytics',
  'Run analytics web socket server',
  (yargs) => yargs.option('port', { default: 8888 }),
  (args) => {
    const { server, disposables } = createAnalytics()

    server.listen(args.port, () => {
      debug('listening on http://0.0.0.0:%d', args.port)
    })

    createTerminus(server, {
      signals: ['SIGINT', 'SIGTERM'],
      healthChecks: {
        '/healthz': async () => 'ok',
      },
      beforeShutdown() {
        const wait = appConfig.env !== 'development' ? 5000 : 0
        return new Promise((resolve) => setTimeout(resolve, wait))
      },
      async onSignal() {
        await disposables.dispose()
      },
    })
  }
)

cli.parse()
