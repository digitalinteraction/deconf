import { assertRequestBody, defineRoute } from "gruber";
import { useAuthz, WebPushDeviceTable } from "../lib/mod.ts";
import { WebPushRepo } from "./web-push-repo.ts";

const _Request = WebPushDeviceTable.partial([
  "name",
  "categories",
  "endpoint",
  "expires_at",
  "keys",
]);

export const updateWebPushDevicesRoute = defineRoute({
  method: "PATCH",
  pathname: "/notifications/v1/conference/:conference/web-push/devices/:device",
  dependencies: {
    authz: useAuthz,
    webPush: WebPushRepo.use,
  },
  async handler({ request, authz, webPush, params }) {
    const { userId } = await authz.assertUser(request, {
      scope: "user:notifications:web-push:devices",
    });

    const body = await assertRequestBody(_Request, request);

    const { registration } = await webPush.assertRegistered(
      params.conference,
      userId,
    );

    const device = await webPush.assertDevice(params.device, registration.id);

    return Response.json(await webPush.updateDevice(device.id, body));
  },
});
