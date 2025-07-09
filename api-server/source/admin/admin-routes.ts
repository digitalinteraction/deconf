import { getConferenceRoute } from "./get-conference.ts";
import { replaceContentRoute } from "./replace-content.ts";
import { replaceScheduleRoute } from "./replace-schedule.ts";

export const adminRoutes = [
  getConferenceRoute,
  replaceScheduleRoute,
  replaceContentRoute,
];
