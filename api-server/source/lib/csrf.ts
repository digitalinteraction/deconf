import { Store } from 'gruber'

const CSRF_DEFAULT_MAX_AGE = 10 * 60 * 1000 // 10 minutes

export class CSRF {
  store: Store
  constructor(store: Store) {
    this.store = store
  }

  async check(token: string | null | undefined) {
    if (!token) return false
    return Boolean(await this.store.get<string>(`/csrf/${token}`))
  }

  async create(maxAge = CSRF_DEFAULT_MAX_AGE) {
    const token = crypto.randomUUID()
    await this.store.set<string>(`/csrf/${token}`, token, { maxAge })
    return token
  }
}
