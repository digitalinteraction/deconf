import { getWebPushCredentials } from "./get-web-push-credentials.ts";
import { createWebPushDevicesRoute } from "./web-push-device-create.ts";
import { deleteWebPushDevicesRoute } from "./web-push-device-delete.ts";
import { updateWebPushDevicesRoute } from "./web-push-device-update.ts";
import { listWebPushDevicesRoute } from "./web-push-devices-list.ts";

export const notificationRoutes = [
  getWebPushCredentials,
  createWebPushDevicesRoute,
  deleteWebPushDevicesRoute,
  listWebPushDevicesRoute,
  updateWebPushDevicesRoute,
];
