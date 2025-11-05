import { appendRegistrationsRoute } from "./append-registrations.ts";
import { getConferenceRoute } from "./get-conference.ts";
import { upsertContentRoute } from "./upsert-content.ts";
import { upsertRegistrationsRoute } from "./upsert-registrations.ts";
import { upsertScheduleRoute } from "./upsert-schedule.ts";
import { getWebPushInfo } from "./web-push-info.ts";
import { sendWebPushMessage } from "./web-push-send.ts";
import { testWebPushMessage } from "./web-push-test.ts";

export const adminRoutes = [
  getConferenceRoute,
  upsertScheduleRoute,
  upsertContentRoute,
  upsertRegistrationsRoute,
  appendRegistrationsRoute,

  getWebPushInfo,
  testWebPushMessage,
  sendWebPushMessage,
];
