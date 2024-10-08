import { HTTPError, loader } from 'gruber'
import cookies from 'cookie'
import { appConfig } from '../config.js'
import { TokenService, useTokenService } from './jwt.js'

// TODO: all of this is a Gruber candidate

export function getRequestBearer(request: Request) {
  const authz = request.headers.get('authorization')
  if (!authz) return null
  return /^bearer (.+)$/i.exec(authz)?.[1] ?? null
}

export function getRequestCookie(request: Request, cookieName: string) {
  return cookies.parse(request.headers.get('Cookie') ?? '')[cookieName] ?? null
}

/**
 * a:b:c -> [a, a:b, a:b:c]
 */
export function expandScopes(scope: string) {
  const prefix = []
  const output = []
  for (const item of scope.split(':')) {
    output.push([...prefix, item].join(':'))
    prefix.push(item)
  }
  return output
}

interface AuthorizationServiceOptions {
  cookieName: string
}

export class AuthorizationService {
  options: AuthorizationServiceOptions
  tokens: TokenService

  constructor(options: AuthorizationServiceOptions, tokens: TokenService) {
    this.options = options
    this.tokens = tokens
  }

  getAuthorizationToken(request: Request) {
    const authz =
      getRequestBearer(request) ??
      getRequestCookie(request, this.options.cookieName)

    if (authz) return authz

    return null
  }

  checkScope(actual: string, expected: string) {
    const required = new Set(expandScopes(expected))

    for (const provided of actual.split(/\s+/)) {
      console.log(provided)

      if (provided === 'admin') return true
      if (required.has(provided)) return true
    }

    return false
  }

  async getAuthorization(request: Request) {
    const token = this.getAuthorizationToken(request)
    if (!token) return null
    return this.tokens.verify(token)
  }

  async assertUser(
    request: Request,
    options: { scope: string },
  ): Promise<{ userId: number; scope: string }> {
    const token = await this.getAuthorization(request)
    if (!token) throw HTTPError.unauthorized('invalid authorization')

    if (token.userId === null) throw HTTPError.unauthorized('not a user')

    if (options.scope && !this.checkScope(token.scope, options.scope)) {
      throw HTTPError.unauthorized('missing required scope: ' + options.scope)
    }

    return { userId: token.userId!, scope: token.scope }
  }
}

export const useAuthentication = loader(() => {
  return new AuthorizationService(
    { cookieName: appConfig.auth.cookieName },
    useTokenService(),
  )
})
