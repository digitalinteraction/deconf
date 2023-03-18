import crypto from 'node:crypto'
import http from 'node:http'
import { any, object, string } from 'superstruct'
import { WebSocketServer } from 'ws'

import {
  assertStruct,
  CompositeDisposable,
  createDebug,
  Disposable,
  prisma,
} from './lib.js'

const debug = createDebug('server')

const LogStruct = object({
  metric: string(),
  payload: any(),
})

// Testing in Node.js REPL:
// node
// > s = new (require('ws').WebSocket)('ws://localhost:8888')
// > s.send(JSON.stringify({ metric: 'pageView', payload: {page:'/'} }))

export function createAnalytics() {
  const disposables = new CompositeDisposable()

  const server = http.createServer()
  const wss = new WebSocketServer({ server })

  disposables.add(
    new Disposable(() => new Promise((resolve) => wss.close(resolve)))
  )

  wss.on('connection', async (socket) => {
    const visitorId = crypto.randomUUID()
    debug('new visitor=%o', visitorId)

    socket.on('message', async (message) => {
      try {
        const { metric, payload } = assertStruct(
          JSON.parse(message.toString('utf8')),
          LogStruct
        )
        debug('log visitor=%o metric=%o', visitorId, metric, payload)

        await prisma.log.create({
          data: { visitorId, metric, payload },
        })
      } catch (error) {
        console.error('Failed to parse message', error)
      }
    })

    socket.once('close', async () => {
      await prisma.log.create({
        data: { visitorId, metric: 'offline', payload: {} },
      })
    })

    await prisma.log.create({
      data: { visitorId, metric: 'online', payload: {} },
    })
  })

  return { server, disposables }
}
