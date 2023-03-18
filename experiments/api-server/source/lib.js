import debug from 'debug'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

import { appConfig } from './config.js'
import { array, create as assertStruct, string, type } from 'superstruct'

export const prisma = new PrismaClient()

export function createDebug(namespace) {
  return debug(`deconf:${namespace}`)
}

export class Disposable {
  /** @param {Function} dispose */
  constructor(dispose) {
    this.dispose = dispose
  }
}

export class CompositeDisposable {
  /** @type {Disposable[]} */
  #children = []

  add(disposable) {
    this.#children.push(disposable)
  }
  remove(disposable) {
    this.#children = this.#children.filter((d) => d !== disposable)
  }
  async dispose() {
    await Promise.all(this.#children.map((d) => d.dispose()))
    this.#children = []
  }
}

export class HttpError extends Error {
  static badRequest(message = 'Bad Request') {
    return new HttpError(400, message)
  }
  static unauthorized(message = 'Unauthorized') {
    return new HttpError(401, message)
  }
  static notFound(message = 'Not Found') {
    return new HttpError(404, message)
  }
  static internalServerError(message = 'Internal Server Error') {
    return new HttpError(500, message)
  }
  static notImplemented(message = 'Not Implemented') {
    return new HttpError(501, message)
  }

  /** @param {number} status */
  constructor(status, message) {
    super(message)
    this.status = status
    this.name = 'HttpError'
    Error.captureStackTrace(this, HttpError)
  }
}

/** @param {string} slug */
export async function assertConference(slug) {
  const conference = await prisma.conference.findUnique({
    where: { slug },
  })
  if (!conference) throw HttpError.notFound()
  return conference.id
}

export { assertStruct }

export const AppToken = type({
  sub: string(),
  roles: array(string()),
  conf: string(),
})

/** @param {import('koa').Context} ctx @param {import('@prisma/client').ConfRole} role*/
export function assertAuthz(ctx, conf, role) {
  const authz =
    ctx.cookies.get('authToken') ??
    getAuthzHeader(ctx.request.header.authorization)

  if (!authz) throw HttpError.unauthorized('No authz present')

  try {
    const payload = assertStruct(
      jwt.verify(authz, appConfig.jwt.secret, {
        issuer: appConfig.jwt.issuer,
      }),
      AppToken
    )

    if (conf !== payload.conf) throw HttpError.unauthorized('Wrong conf')
    if (
      !payload.roles.includes(role) &&
      !payload.roles.some((r) => r === 'ADMIN')
    ) {
      throw HttpError.unauthorized('Missing roles')
    }

    return parseInt(payload.sub)
  } catch (error) {
    console.error(error)
    throw HttpError.unauthorized()
  }
}
function getAuthzHeader(authorization) {
  return (/bearer (.+)/i.exec(authorization) ?? [])[1]
}
