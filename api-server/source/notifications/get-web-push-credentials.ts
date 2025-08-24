import { defineRoute } from "gruber";
import { useAppConfig } from "../lib/mod.ts";

export const getWebPushCredentials = defineRoute({
  method: "GET",
  pathname: "/notify/v1/web-push/credentials",
  dependencies: {
    appConfig: useAppConfig,
  },
  handler({ appConfig }) {
    return Response.json({
      publicKey: appConfig.webPush.credentials.publicKey,
    });
  },
});
