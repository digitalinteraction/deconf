import fs from 'node:fs'
import { create, defaulted, object, string } from 'superstruct'

const NOT_SECRET = 'not_secret'

const AppConfig = object({
  selfUrl: defaulted(string(), 'http://localhost:3000'),
  env: defaulted(string(), 'production'),
  jwt: defaulted(
    object({
      secret: defaulted(string(), NOT_SECRET),
      issuer: defaulted(string(), 'deconf-api-server'),
    }),
    {}
  ),
  cookies: defaulted(
    object({
      secret: defaulted(string(), NOT_SECRET),
    }),
    {}
  ),
})

function fileExists(file) {
  try {
    return fs.statSync(file).isFile()
  } catch {
    return false
  }
}

function loadJsonConfig(file) {
  if (!fileExists(file)) return create({}, AppConfig)
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return create(data, AppConfig)
  } catch (error) {
    console.error('Failed to load config path=%o', file, error)
    throw new Error('Invalid configuration')
  }
}

export function loadConfig(env = process.env) {
  const config = loadJsonConfig('app-config.json')

  if (env.NODE_ENV) config.env = env.NODE_ENV
  if (env.SELF_URL) config.selfUrl = env.SELF_URL
  if (env.JWT_SECRET) config.jwt.secret = env.JWT_SECRET

  if (config.env === 'production' && config.jwt.secret === NOT_SECRET) {
    throw new Error('config.jwt.secret not configured')
  }
  if (config.env === 'production' && config.cookies.secret === NOT_SECRET) {
    throw new Error('config.jwt.secret not configured')
  }
  return config
}

export const appConfig = loadConfig()

export const asAny = (input) => input
