import { assertRequestBody, defineRoute, Structure } from "gruber";
import { useAuthz } from "../lib/globals.ts";
import { WebPushPayload, WebPushRepo } from "../notifications/web-push-repo.ts";
import { _sendToDevices } from "./web-push-send.ts";

const _Request = Structure.object({
  title: Structure.string(),
  body: Structure.string(),
  url: Structure.url(),
});

export const testWebPushMessage = defineRoute({
  method: "POST",
  pathname: "/admin/v1/conference/:conference/web-push-test",
  dependencies: {
    authz: useAuthz,
    webPush: WebPushRepo.use,
  },
  async handler({ request, params, webPush, authz }) {
    const { userId } = await authz.assertUser(request, {
      scope: "admin",
    });

    const { registration } = await webPush.assertRegistered(
      params.conference,
      userId,
    );

    // Ensure the HTTP body is a valid message payload
    const body = await assertRequestBody(_Request, request);

    // Get the user's web-push-devices
    const devices = await webPush.listDevices(registration.id);

    // Send a message to those devices
    const stats = await _sendToDevices(devices, webPush, {
      title: body.title,
      body: body.body,
      data: {
        url: body.url.toString(),
      },
    });

    return Response.json(stats);
  },
});
