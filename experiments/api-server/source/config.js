import fs from 'node:fs'
import { create, defaulted, object, string } from 'superstruct'

const AppConfig = object({
  selfUrl: defaulted(string(), 'http://localhost:3000'),
  env: defaulted(string(), 'production'),
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

  return config
}

export const appConfig = loadConfig()
