import {
  defineRoute,
  FetchRouter,
  getFetchRequest,
  NodeRouter,
  serveHTTP,
} from "gruber";
import {
  useAppConfig,
  useCors,
  useDatabase,
  useStore,
  useTerminator,
} from "./lib/mod.js";

import legacyRoutes from "./legacy/routes.js";
import { authRoutes } from "./auth/auth-routes.ts";
import { notificationRoutes } from "./notifications/notification-routes.ts";
import { adminRoutes } from "./admin/admin-routes.ts";

export interface RunServerOptions {
  port: number;
  hostname: string;
}

const hello = defineRoute({
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

const healthz = defineRoute({
  method: "GET",
  pathname: "/healthz",
  dependencies: {
    arnie: useTerminator,
  },
  async handler({ arnie }) {
    return arnie.getResponse();
  },
});

const routes = [
  hello,
  healthz,
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
