import { defineRoute } from "gruber";
import { useAuthz } from "../lib/globals.ts";
import { WebPushRepo } from "./web-push-repo.ts";
import { assertRequestBody } from "gruber/http/request-body.js";
import { WebPushDeviceTable } from "../lib/tables.ts";

export const createWebPushDevicesRoute = defineRoute({
  method: "POST",
  pathname: "/notifications/v1/conference/:conference/web-push/devices",
  dependencies: {
    authz: useAuthz,
    webPush: WebPushRepo.use,
  },
  async handler({ request, authz, webPush, params }) {
    const { userId } = await authz.assertUser(request, {
      scope: "notifications:web-push:devices",
    });

    const body = await assertRequestBody(
      WebPushDeviceTable.structure([
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

    const record = await webPush.createDevice({
      ...body,
      registration_id: registration.id,
    });

    return Response.json(record);
  },
});
