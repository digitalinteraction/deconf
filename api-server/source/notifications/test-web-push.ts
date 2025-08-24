import { defineRoute } from "gruber";
import { useAuthz } from "../lib/globals.ts";
import { WebPushRepo } from "./web-push-repo.ts";

export const testWebPushRoute = defineRoute({
  method: "POST",
  pathname: "/notifications/v1/conference/:conference/web-push/test",
  dependencies: {
    authz: useAuthz,
    webPush: WebPushRepo.use,
  },
  async handler({ request, params, webPush, authz }) {
    const { userId } = await authz.assertUser(request, {
      scope: "user:notifications:web-push",
    });

    const { registration } = await webPush.assertRegistered(
      params.conference,
      userId,
    );

    const devices = await webPush.listDevices(registration.id);

    for (const device of devices) {
      await webPush.enqueueMessage(device.id, {
        title: "Hello There!",
        body: "General Kenobi",
        data: {
          url: "https://example.com",
        },
      });
    }

    return new Response("OK");
  },
});
