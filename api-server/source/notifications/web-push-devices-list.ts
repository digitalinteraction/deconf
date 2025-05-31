import { defineRoute } from "gruber";
import { useAuthz } from "../lib/globals.ts";
import { WebPushRepo } from "./web-push-repo.ts";

export const listWebPushDevicesRoute = defineRoute({
  method: "GET",
  pathname: "/notifications/v1/conference/:conference/web-push/devices",
  dependencies: {
    authz: useAuthz,
    webPush: WebPushRepo.use,
  },
  async handler({ request, authz, webPush, params }) {
    const { userId } = await authz.assertUser(request, {
      scope: "notifications:web-push:devices",
    });

    const { registration } = await webPush.assertRegistered(
      params.conference,
      userId,
    );

    return Response.json(await webPush.listDevices(registration.id));
  },
});
