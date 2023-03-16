import debug from 'debug'
import { PrismaClient } from '@prisma/client'

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
    this.status = status
    super(message)
    this.name = 'HttpError'
    Error.captureStackTrace(this, ApiError)
  }
}
