import { defineRoute, FetchRouter, HTTPError, serveHTTP } from "gruber";
import {
  useAppConfig,
  useCors,
  useDatabase,
  useStore,
  useTerminator,
} from "./lib/mod.ts";

import { adminRoutes } from "./admin/admin-routes.ts";
import { authRoutes } from "./auth/auth-routes.ts";
import { legacyRoutes } from "./legacy/legacy-routes.ts";
import { notificationRoutes } from "./notifications/notification-routes.ts";

export interface RunServerOptions {
  port: number;
  hostname: string;
}

const helloRoute = defineRoute({
  method: "GET",
  pathname: "/",
  dependencies: {
    appConfig: useAppConfig,
  },
  async handler({ appConfig }) {
    return Response.json({
      message: "ok",
      meta: appConfig.meta,
    });
  },
});

const readyzRoute = defineRoute({
  method: "GET",
  pathname: "/readyz",
  dependencies: {
    arnie: useTerminator,
    store: useStore,
  },
  async handler({ arnie, store }) {
    if (arnie.state === "running") {
      const ok = await store.isReady();
      if (!ok) throw new HTTPError(503);
    }
    return arnie.getResponse();
  },
});

const livezRoute = defineRoute({
  method: "GET",
  pathname: "/livez",
  dependencies: {
    arnie: useTerminator,
  },
  handler: () => new Response(),
});

// NOTE: review this
// const jwksRoute = defineRoute({
//   method: "GET",
//   pathname: "/.well-known/jwks.json",
//   dependencies: {
//     appConfig: useAppConfig,
//   },
//   async handler({ appConfig }) {
//     return Response.json({
//       keys: [appConfig.jwt.key.publicKey],
//     });
//   },
// });

const corsRoute = defineRoute({
  method: "OPTIONS",
  pathname: "*",
  dependencies: {
    cors: useCors,
  },
  async handler({ request, cors }) {
    return cors?.apply(request, new Response());
  },
});

export const routes = [
  helloRoute,
  readyzRoute,
  livezRoute,
  corsRoute,
  ...legacyRoutes,
  ...authRoutes,
  ...notificationRoutes,
  ...adminRoutes,
];

export async function runServer(options: RunServerOptions) {
  const cors = useCors();
  const sql = useDatabase();
  const store = useStore();
  const arnie = useTerminator();

  const router = new FetchRouter({
    log: true,
    cors,
    routes,
    errorHandler(error, request) {
      console.error("[http error]", request.url, error);
    },
  });

  const server = await serveHTTP(options, (r) => router.getResponse(r));

  arnie.start(async () => {
    await server.stop();
    await sql.end();
    await store.dispose();
  });
}
