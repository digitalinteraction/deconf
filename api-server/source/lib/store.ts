import type { Store, StoreSetOptions } from "gruber";
import { createClient, type SetOptions } from "redis";

/** Options for creating a {@link RedisStore} */
export interface RedisOptions {
  /** Where to connect, e.g. `redis://localhost:6379` */
  url: URL;

  /** Prepended to every key to namespace them, e.g. `"rtd:"`. Can be empty */
  prefix?: string;

  /**
   * @unstable
   *
   * Capture logging output
   */
  log?: _RedisLogger;
}

/**
 * The reconnect strategy for {@link RedisStore}: exponential backoff with jitter.
 *
 * The delay starts at 100ms and doubles on each attempt up to 30s, plus up to
 * 250ms of random jitter so many instances don't all retry at once.
 * It always returns a number, so the client never gives up. Giving up would
 * close the client for good and `/readyz` would stay at 503 until a restart.
 *
 * ```ts
 * _redisBackoff(0); // ~100ms
 * _redisBackoff(3); // ~800ms
 * _redisBackoff(20); // ~30s
 * ```
 *
 * @param retries how many attempts have failed so far, starting at 0
 * @returns milliseconds to wait before the next attempt
 */
export function _redisBackoff(retries: number): number {
  return Math.min(100 * 2 ** retries, 30_000) + Math.floor(Math.random() * 250);
}

/** Create a client set up to fail fast and reconnect with {@link _redisBackoff} */
export function _createRedisClient(url: URL) {
  return createClient({
    url: url.toString(),

    // Commands fail straight away while disconnected, instead of waiting
    disableOfflineQueue: true,

    socket: {
      connectTimeout: 5_000,
      reconnectStrategy: _redisBackoff,
    },
  });
}

export type _RedisLogger = (message: string, ...args: any[]) => void;

/** The client type {@link RedisStore} uses, inferred so redis' generics line up */
export type RedisClient = ReturnType<typeof _createRedisClient>;

/**
 * A Gruber {@link Store} backed by Redis. Values are stored as JSON under
 * {@link RedisOptions.prefix} + key.
 *
 * When started the client will connect in the background with an exponential
 * backoff until it is closed. You can query if it is connected with
 * {@link isReady}. While disconnected get/set/delete throw with a
 * `ClientOfflineError` error instead of queueing.
 *
 * The {@link isReady} hook is designed for a `/readyz` endpoint to stop
 * routing traffic if a server cannot connect to redis but not restart it.
 *
 * ```ts
 * const store = RedisStore.createAndStart({
 *   url: new URL("redis://localhost:6379"),
 *   prefix: "rtd:",
 * });
 *
 * await store.set("users/geoff", { name: "Geoff" }, { maxAge: 60_000 });
 * await store.get("users/geoff"); // { name: "Geoff" }
 *
 * if (!await store.isReady()) console.log("redis is down");
 *
 * await store.dispose();
 * ```
 */
export class RedisStore implements Store {
  /** The underlying redis client, for commands the Store interface doesn't cover */
  client: RedisClient;

  /** Prepended to every key */
  prefix: string;

  log: _RedisLogger;

  constructor(options: RedisOptions) {
    this.prefix = options.prefix ?? "";
    this.client = _createRedisClient(options.url);
    this.log = options.log ?? (() => {});

    // Without an error listener, a dropped connection crashes the process
    // Connection failures are AggregateErrors with no message, so fall back to the code
    this.client.on("error", (error) => {
      this.log("[redis]", error?.message || error?.code || error);
    });
    this.client.on("ready", () => this.log("[redis] ready"));
  }

  /** Create a RedisStore and immediately start it */
  static createAndStart(options: RedisOptions) {
    const client = new RedisStore(options);
    client.start();
    return client;
  }

  /** Start the client background connection process */
  start() {
    // Don't wait here, the client retries until it connects or is closed
    this.client.connect().catch(() => {});
  }

  /**
   * Whether the internal client is connected and can run commands right now.
   * This is `false` before the first connection, during an outage and after
   * closing.
   */
  isReady(): Promise<boolean> {
    return Promise.resolve(this.client.isReady);
  }

  /**
   * Retrieve and JSON-parse a value.
   *
   * @returns the value, or `undefined` if the key doesn't exist or has expired
   * @throws `ClientOfflineError` if not connected to Redis
   */
  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.client.get(this.prefix + key);
    return typeof value === "string" ? JSON.parse(value) : undefined;
  }

  /**
   * JSON-stringify and store a value, replacing any existing one.
   *
   * `maxAge` is in milliseconds. If it is missing or `0` the value never
   * expires, matching Gruber's `MemoryStore` (Redis itself rejects an expiry
   * of 0).
   *
   * @throws `ClientOfflineError` if not connected to Redis
   */
  async set<T>(
    key: string,
    value: T,
    { maxAge }: StoreSetOptions = {},
  ): Promise<void> {
    const options: SetOptions = {};

    // Redis rejects an expiry of 0 and is treated as no-expiry
    if (typeof maxAge === "number" && maxAge > 0) {
      options.expiration = { type: "PX", value: maxAge };
    }
    await this.client.set(this.prefix + key, JSON.stringify(value), options);
  }

  /**
   * Remove a value from the store
   *
   * @throws `ClientOfflineError` if not connected to Redis
   */
  async delete(key: string): Promise<void> {
    await this.client.del(this.prefix + key);
  }

  /**
   * Close the connection, waiting for in-flight commands to finish. This also
   * stops any retries in progress. Safe to call more than once.
   */
  async dispose(): Promise<void> {
    if (this.client.isOpen) await this.client.close();
  }

  /**
   * Close the connection, see {@link dispose}
   *
   * @deprecated in Gruber's `Store`, use {@link dispose}
   */
  close(): Promise<void> {
    return this.dispose();
  }

  /** Close the connection when used with `await using`, see {@link dispose} */
  [Symbol.asyncDispose]() {
    return this.dispose();
  }
}
