import { defineRoute, FetchRouter, serveHTTP } from "gruber";
import {
  useAppConfig,
  useCors,
  useDatabase,
  useStore,
  useTerminator,
} from "./lib/mod.js";

import { adminRoutes } from "./admin/admin-routes.ts";
import { authRoutes } from "./auth/auth-routes.ts";
import legacyRoutes from "./legacy/routes.js";
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

const healthzRoute = defineRoute({
  method: "GET",
  pathname: "/healthz",
  dependencies: {
    arnie: useTerminator,
  },
  async handler({ arnie }) {
    return arnie.getResponse();
  },
});

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

const routes = [
  helloRoute,
  healthzRoute,
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
    await store.close();
  });
}
