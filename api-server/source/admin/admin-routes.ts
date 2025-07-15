import { getConferenceRoute } from "./get-conference.ts";
import { upsertContentRoute } from "./upsert-content.ts";
import { upsertRegistrationsRoute } from "./upsert-registrations.ts";
import { upsertScheduleRoute } from "./upsert-schedule.ts";

export const adminRoutes = [
  getConferenceRoute,
  upsertScheduleRoute,
  upsertContentRoute,
  upsertRegistrationsRoute,
];
