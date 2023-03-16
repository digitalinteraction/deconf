import http from 'node:http'

import Koa from 'koa'
import KoaRouter from '@koa/router'
import koaJson from 'koa-json'
import koaBodyParser from 'koa-bodyparser'

import { CompositeDisposable, createDebug, HttpError } from './lib.js'

import { scheduleV1 } from './schedule.js'

const debug = createDebug('server')

async function middleware(ctx, next) {
  try {
    await next()
    debug(
      '%s %i %s %s',
      ctx.request.method,
      ctx.response.status,
      ctx.request.path
    )
  } catch (error) {
    if (error instanceof HttpError) {
      ctx.status = error.status
      ctx.body = error.message
    } else {
      console.error('Fatal error', error)
      process.exit(1)
    }
  }
}

export function createServer() {
  const disposable = new CompositeDisposable()

  const router = new KoaRouter()

  // router.get('/', (ctx) => {
  //   ctx.body = 'Hello there!'
  // })

  const schedule = scheduleV1()
  router.use('/schedule/v1', schedule.routes(), schedule.allowedMethods())

  const app = new Koa()
    .use(koaJson())
    .use(koaBodyParser())
    .use(middleware)
    .use(router.routes())
    .use(router.allowedMethods())

  const server = http.createServer(app.callback())
  const dispose = () => disposable.dispose()

  return { server, dispose }
}
