import { loader } from 'gruber'
import redis from 'redis'
import { appConfig } from '../config.js'

// TODO: all of this is a Gruber candidate

export interface KeyValueSetOptions {
  /** expire after this many **seconds** */
  duration?: number
}

export type Cachable = [`/${string}`, unknown]

// export type SimpleCachable = [`/${string}`, any]

export type OptionalPromise<T> = T | Promise<T>

export interface KeyValueStore {
  get<T extends Cachable>(key: T[0]): OptionalPromise<T[1] | null>

  set<T extends Cachable>(
    key: T[0],
    value: T[1],
    options?: KeyValueSetOptions,
  ): OptionalPromise<void>

  delete<T extends Cachable>(key: T[0]): OptionalPromise<void>

  close(): Promise<void>
}

export class RedisStore implements KeyValueStore {
  client: redis.RedisClientType
  prefix: string

  constructor(client: redis.RedisClientType, prefix: string) {
    this.client = client
    this.prefix = prefix
  }

  async get<T extends Cachable>(key: T[0]): Promise<T[1] | null> {
    const result = await this.client.get(this.prefix + key)
    return typeof result === 'string'
      ? (JSON.parse(result as string) as T[1])
      : null
  }
  async set<T extends Cachable>(
    key: T[0],
    value: T[1],
    options?: KeyValueSetOptions,
  ): Promise<void> {
    const opts: redis.SetOptions = {}
    if (typeof options?.duration === 'number') opts.EX = options.duration
    await this.client.set(this.prefix + key, JSON.stringify(value), opts)
  }

  async delete<T extends Cachable>(key: T[0]): Promise<void> {
    await this.client.del(this.prefix + key)
  }

  async close() {
    await this.client.quit()
  }
}

export const useStore = loader(async () => {
  const client = await redis
    .createClient({
      url: appConfig.redis.url.toString(),
    })
    .on('error', (error) => console.error('Redis error', error))
    .connect()

  return new RedisStore(client as redis.RedisClientType, appConfig.redis.prefix)
})
