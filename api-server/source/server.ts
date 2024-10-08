import http from 'node:http'
import { defineRoute, getFetchRequest, NodeRouter } from 'gruber'
import { useCors, useDatabase, useStore } from './lib/mod.js'

import legacyRoutes from './legacy/routes.js'

export interface RunServerOptions {
  port: number
  hostname: string
}

const corsRoute = defineRoute({
  method: 'OPTIONS',
  pathname: '*',
  handler({ request }) {
    const response = new Response(undefined)
    return useCors()?.apply(request, response) ?? response
  },
})

export function runServer(options: RunServerOptions) {
  const cors = useCors()
  const sql = useDatabase()
  const store = useStore()

  const router = new NodeRouter({
    routes: [corsRoute, ...legacyRoutes],
  })

  const server = http.createServer(async (req, res) => {
    const request = getFetchRequest(req)
    const response = await router.getResponse(request)
    console.log(response.status, request.method, request.url)
    return router.respond(res, cors ? cors.apply(request, response) : response)
  })

  // TODO: use gruber's Terminator when released

  server.listen(options.port, options.hostname, () => {
    console.log('Listening on http://%s:%d', options.hostname, options.port)
  })
}
