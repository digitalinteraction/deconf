import { getConferenceRoute } from "./get-conference.ts";
import { replaceScheduleRoute } from "./replace-schedule.ts";

export const adminRoutes = [getConferenceRoute, replaceScheduleRoute];
