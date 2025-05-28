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

export async function runServer(options: RunServerOptions) {
  const cors = useCors();
  const sql = useDatabase();
  const store = useStore();
  const arnie = useTerminator();

  const router = new FetchRouter({
    log: true,
    cors: cors,
    routes: [hello, healthz, ...legacyRoutes],
  });

  const server = await serveHTTP(options, (r) => router.getResponse(r));

  arnie.start(async () => {
    await server.stop();
    await sql.end();
    await store.close();
  });
}
