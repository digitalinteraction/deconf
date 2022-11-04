#!/usr/bin/env node

import http from 'http'
import fs from 'fs/promises'
import url from 'url'
import express from 'express'
import { createTerminus } from '@godaddy/terminus'

import { NodePortalServer } from '@openlab/portals/node-server.js'

interface AppConfig {
  rooms: string[]
}

const { APP_PORT = '8080', NODE_ENV = 'production' } = process.env

async function main() {
  const config: AppConfig = JSON.parse(
    await fs.readFile('app-config.json', 'utf8')
  )

  const publicDir = url.fileURLToPath(new URL('../public', import.meta.url))
  const distDir = url.fileURLToPath(new URL('../dist', import.meta.url))

  const app = express()
    .use(express.static(publicDir))
    .use('/dist', express.static(distDir))
    .use(express.text())

  const server = http.createServer(app)
  const portal = new NodePortalServer({
    server,
    path: '/portal',
    rooms: config.rooms,
  })

  server.listen(APP_PORT, () => console.log('Listening on :%s', APP_PORT))

  createTerminus(server, {
    signals: ['SIGINT', 'SIGTERM'],
    healthChecks: {
      '/healthz': async () => 'ok',
    },
    async beforeShutdown() {
      const wait = NODE_ENV === 'production' ? 5_000 : 0
      console.debug('terminus@beforeShutdown')
      await new Promise((resolve) => setTimeout(resolve, wait))
    },
    async onSignal() {
      console.debug('terminus@onSignal')
    },
  })
}

main()
