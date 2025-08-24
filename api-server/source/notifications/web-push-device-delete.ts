import { defineRoute } from "gruber";
import { useAuthz } from "../lib/globals.ts";
import { WebPushRepo } from "./web-push-repo.ts";

export const deleteWebPushDevicesRoute = defineRoute({
  method: "DELETE",
  pathname: "/notifications/v1/conference/:conference/web-push/devices/:device",
  dependencies: {
    authz: useAuthz,
    webPush: WebPushRepo.use,
  },
  async handler({ request, authz, webPush, params }) {
    const { userId } = await authz.assertUser(request, {
      scope: "user:notifications:web-push:devices",
    });

    const { registration } = await webPush.assertRegistered(
      params.conference,
      userId,
    );

    const device = await webPush.assertDevice(params.device, registration.id);

    await webPush.deleteDevice(device.id);

    return new Response("OK");
  },
});
