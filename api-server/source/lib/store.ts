import { Store, StoreSetOptions } from "gruber";
import * as redis from "redis";

type NodeRedis = redis.RedisClientType;

// TODO: gruber candidate

export interface NodeRedisStoreOptions {
  prefix?: string;
}

// TODO: gruber candidate

export class NodeRedisStore implements Store {
  _client: Promise<NodeRedis>;
  prefix: string;
  constructor(url: string | URL, options: NodeRedisStoreOptions = {}) {
    url = url.toString();
    this._client = redis.createClient({ url }).connect() as Promise<NodeRedis>;
    this.prefix = options.prefix ?? "";
  }

  async client<T>(block: (client: NodeRedis) => T): Promise<T> {
    return block(await this._client);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const result = await this.client((c) => c.get(this.prefix + key));
    return typeof result === "string"
      ? (JSON.parse(result as string) as T)
      : undefined;
  }

  async set<T>(
    key: string,
    value: T,
    options?: StoreSetOptions,
  ): Promise<void> {
    const opts: redis.SetOptions = {};
    if (typeof options?.maxAge === "number") {
      opts.expiration = { type: "PX", value: options.maxAge };
    }

    await this.client((c) =>
      c.set(this.prefix + key, JSON.stringify(value), opts),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client((c) => c.del(this.prefix + key));
  }

  async close(): Promise<void> {
    await this.client((c) => c.isOpen && c.quit());
  }
}
