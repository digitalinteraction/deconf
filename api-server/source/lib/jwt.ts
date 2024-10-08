import { loader } from 'gruber'
import { SignJWT, jwtVerify } from 'jose'
import { appConfig } from '../config.js'

// TODO: all of this is a Gruber candidate

export interface SignTokenOptions {
  expiration?: number | Date
}

export interface TokenService {
  verify(token: string): Promise<{ userId?: number; scope: string } | null>
  sign(
    userId: number | null,
    scope: string,
    options?: SignTokenOptions,
  ): Promise<string>
}

export interface JwtServiceOptions {
  secret: string
  issuer: string
  audience: string
}

function tryInteger(input: string | null | undefined) {
  const value = typeof input === 'string' ? parseInt(input, 10) : Number.NaN
  return Number.isNaN(value) ? undefined : value
}

export class JwtService implements TokenService {
  options: JwtServiceOptions
  #secret: Uint8Array

  constructor(options: JwtServiceOptions) {
    this.options = options
    this.#secret = new TextEncoder().encode(this.options.secret)
  }

  async verify(
    token: string,
  ): Promise<{ userId?: number; scope: string } | null> {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(this.options.secret),
        {
          issuer: this.options.issuer,
          audience: this.options.audience,
        },
      )
      return { userId: tryInteger(payload.sub), scope: payload.scope as string }
    } catch {
      return null
    }
  }
  sign(
    userId: number | null,
    scope: string,
    options: SignTokenOptions = {},
  ): Promise<string> {
    const jwt = new SignJWT({ scope })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(this.options.issuer)
      .setAudience(this.options.audience)
    // .setExpirationTime(expiration)

    if (typeof userId === 'number') jwt.setSubject(userId.toString())

    if (typeof options.expiration !== 'undefined') {
      jwt.setExpirationTime(options.expiration)
    }

    return jwt.sign(this.#secret)
  }
}

export const useTokenService = loader(() => {
  return new JwtService({
    audience: appConfig.jwt.audience,
    issuer: appConfig.jwt.issuer,
    secret: appConfig.jwt.secret,
  })
})
