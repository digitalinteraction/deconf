import { RandomService, Store } from "gruber";

const CSRF_DEFAULT_MAX_AGE = 10 * 60 * 1000; // 10 minutes

/**
 * A class for generating tokens to prevent Cross Site Request Forgery.
 * You use an instance to generate a token which lives for a maximum duration,
 * then when data is later submitted, you check it contains a valid CSRF
 */
export class CSRF {
  store: Store;
  random: RandomService;
  constructor(store: Store, random: RandomService) {
    this.store = store;
    this.random = random;
  }

  async check(token: string | null | undefined) {
    if (!token) return false;
    return Boolean(await this.store.get<string>(`/csrf/${token}`));
  }

  async create(maxAge = CSRF_DEFAULT_MAX_AGE) {
    const token = this.random.uuid();
    await this.store.set<string>(`/csrf/${token}`, token, { maxAge });
    return token;
  }
}
