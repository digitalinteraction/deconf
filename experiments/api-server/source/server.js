import http from 'node:http'

import Koa from 'koa'
import KoaRouter from '@koa/router'
import koaJson from 'koa-json'
import koaBodyParser from 'koa-bodyparser'

import {
  CompositeDisposable,
  createDebug,
  HttpError,
  prisma,
  Disposable,
} from './lib.js'

import { scheduleV1 } from './schedule.js'
import { StructError } from 'superstruct'
import { authV1 } from './auth.js'

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
    } else if (error instanceof StructError) {
      ctx.status = 400
      ctx.body = { ...error }
    } else {
      console.error('Fatal error', error)
      process.exit(1)
    }
  }
}

export function createServer() {
  const disposables = new CompositeDisposable()
  disposables.add(new Disposable(() => prisma.$disconnect()))

  const router = new KoaRouter()

  router.get('/', (ctx) => {
    ctx.body = { name: 'api-server', version: '0.0.0' }
  })

  const schedule = scheduleV1()
  router.use('/schedule/v1', schedule.routes(), schedule.allowedMethods())

  const auth = authV1('/auth/v1')
  router.use('/auth/v1', auth.routes(), auth.allowedMethods())

  const app = new Koa()
    .use(koaJson())
    .use(koaBodyParser())
    .use(middleware)
    .use(router.routes())
    .use(router.allowedMethods())

  const server = http.createServer(app.callback())

  return { server, disposables }
}
