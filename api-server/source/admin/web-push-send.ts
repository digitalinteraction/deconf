import { assertRequestBody, defineRoute, Structure } from "gruber";
import { useAuthz } from "../lib/globals.ts";
import { WebPushPayload, WebPushRepo } from "../notifications/web-push-repo.ts";
import { WebPushDeviceRecord } from "../lib/types.ts";

const _Request = Structure.object({
  title: Structure.string(),
  body: Structure.string(),
  url: Structure.url(),
});

export const sendWebPushMessage = defineRoute({
  method: "POST",
  pathname: "/admin/v1/conferences/:conference/web-push/send",
  dependencies: {
    authz: useAuthz,
    webPush: WebPushRepo.use,
  },
  async handler({ request, params, webPush, authz }) {
    const { userId } = await authz.assertUser(request, {
      scope: "admin",
    });

    const { conference } = await webPush.assertRegistered(
      params.conference,
      userId,
    );

    // Ensure the HTTP body is a valid message payload
    const body = await assertRequestBody(_Request, request);

    // Get all of the web-push-devices for the conference
    const devices = await webPush.listConferenceDevices(conference.id, [
      "Special",
    ]);

    // Send the message
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

export async function _sendToDevices(
  devices: WebPushDeviceRecord[],
  webPush: WebPushRepo,
  payload: WebPushPayload,
) {
  // NOTE: these are run as seperate steps so they can fail independantly

  // Enqueue a message for each device
  const enqueued = await Promise.all(
    devices.map(async (device) => {
      const message = await webPush.enqueueMessage(device.id, payload);
      return { device, message };
    }),
  );

  // Track sending stats
  const stats = {
    devices: enqueued.length,
    sent: 0,
  };

  // Try to send each message and update the stats
  for (const { message, device } of enqueued) {
    const success = await webPush.attemptToSend(message, device);
    if (success) stats.sent++;
  }

  return stats;
}
