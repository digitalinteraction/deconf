import { defineRoute, HTTPError } from "gruber";
import { useAuthz } from "../lib/globals.ts";
import { WebPushRepo } from "./web-push-repo.ts";
import { assertRequestBody } from "gruber/http/request-body.js";
import { WebPushDeviceTable } from "../lib/tables.ts";
import { assertRequestParam } from "../lib/gruber-hacks.ts";

export const updateWebPushDevicesRoute = defineRoute({
  method: "PATCH",
  pathname: "/notifications/v1/conference/:conference/web-push/devices/:device",
  dependencies: {
    authz: useAuthz,
    webPush: WebPushRepo.use,
  },
  async handler({ request, authz, webPush, params }) {
    const { userId } = await authz.assertUser(request, {
      scope: "notifications:web-push:devices",
    });

    const body = await assertRequestBody(
      WebPushDeviceTable.partial([
        "name",
        "categories",
        "endpoint",
        "expires_at",
        "keys",
      ]),
      request,
    );

    const { registration } = await webPush.assertRegistered(
      params.conference,
      userId,
    );

    const device = await webPush.assertDevice(params.device, registration.id);

    return Response.json(await webPush.updateDevice(device.id, body));
  },
});
