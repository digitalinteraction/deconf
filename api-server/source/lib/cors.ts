// Stolen from https://github.com/digitalinteraction/hub.openlab.dev/blob/main/server_lib/server.ts
// from https://github.com/robb-j/drax-metrics/blob/main/source/server.ts

import { appConfig } from '../config.js'

// that is loosely based on https://github.com/expressjs/cors/blob/master/lib/index.js
interface CorsOptions {
  origins?: string[]
  credentials?: boolean
}
export class Cors {
  origins: Set<string>
  credentials: boolean
  constructor(options: CorsOptions) {
    this.credentials = options.credentials ?? false
    this.origins = new Set(options.origins ?? ['*'])
  }

  apply(request: Request, response: Response) {
    const headers = new Headers(response.headers)

    // HTTP methods
    headers.set(
      'Access-Control-Allow-Methods',
      'GET, HEAD, PUT, PATCH, POST, DELETE',
    )

    // Headers
    if (request.headers.has('access-control-request-headers')) {
      headers.append(
        'Access-Control-Allow-Headers',
        request.headers.get('access-control-request-headers')!,
      )
      headers.append('Vary', 'Access-Control-Request-Headers')
    }

    // Origins
    if (this.origins.has('*')) {
      headers.set(
        'Access-Control-Allow-Origin',
        request.headers.get('origin') ?? '*',
      )
      headers.append('Vary', 'Origin')
    } else if (
      request.headers.has('origin') &&
      this.origins.has(request.headers.get('origin')!)
    ) {
      headers.set('Access-Control-Allow-Origin', request.headers.get('origin')!)
      headers.append('Vary', 'Origin')
    }

    // Credentials
    if (this.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true')
    }

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    })
  }
}

export function useCors() {
  return appConfig.env === 'development'
    ? new Cors({
        origins: ['http://localhost:8080'],
        credentials: true,
      })
    : null
}
