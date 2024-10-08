import { getNodeConfiguration } from 'gruber'
import pkg from '../package.json' with { type: 'json' }

const config = getNodeConfiguration()

const spec = config.object({
  env: config.string({ variable: 'NODE_ENV', fallback: 'development' }),

  meta: config.object({
    name: config.string({ variable: 'APP_NAME', fallback: pkg.name }),
    version: config.string({ variable: 'APP_VERSION', fallback: pkg.version }),
  }),

  server: config.object({
    port: config.number({ variable: 'PORT', fallback: 3000 }),
    hostname: config.string({ variable: 'HOST', fallback: '0.0.0.0' }),
  }),

  locations: config.object({
    self: config.url({
      variable: 'SELF_URL',
      fallback: 'http://localhost:3000',
    }),
    // portal ???
    // homepage ???
  }),

  postgres: config.object({
    url: config.url({
      variable: 'POSTGRES_URL',
      fallback: 'postgres://user:secret@localhost:5432/user',
    }),
  }),

  redis: config.object({
    prefix: config.string({ variable: 'REDIS_FALLBACK', fallback: '' }),
    url: config.url({
      variable: 'REDIS_URL',
      fallback: 'redis://localhost:6379',
    }),
  }),

  auth: config.object({
    cookieName: config.string({
      variable: 'AUTH_COOKIE_NAME',
      fallback: 'deconf-api-server',
    }),
  }),

  jwt: config.object({
    issuer: config.string({
      variable: 'JWT_ISSUER',
      fallback: 'deconf.app',
    }),
    audience: config.string({
      variable: 'JWT_AUDIENCE',
      fallback: 'deconf.app',
    }),
    secret: config.string({ variable: 'JWT_SECRET', fallback: 'not_secret' }),
  }),
})

export function loadConfig(path: string | URL) {
  // TODO: additional runtime checks
  return config.load(path, spec)
}

export const appConfig = await loadConfig(import.meta.resolve('../config.json'))

export function dumpConfig() {
  console.log(config.getUsage(spec, appConfig))
}
