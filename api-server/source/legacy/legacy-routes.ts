import {
  attendRoute,
  selfAttendanceRoute,
  sessionAttendanceRoute,
  unattendRoute,
} from "./attendance.ts";
import {
  createUserCal,
  getUserCal,
  sessionGoogleCalRoute,
  sessionIcsRoute,
} from "./calendar.ts";
import { getScheduleRoute, getSessionLinksRoute } from "./conference.ts";
import { getContentRoute } from "./content.ts";
import { metricRoute } from "./metrics.ts";
import { getRegistrationRoute } from "./registration.ts";

export const legacyRoutes = [
  // Conference
  getSessionLinksRoute,
  getScheduleRoute,

  // Attendance
  selfAttendanceRoute,
  attendRoute,
  unattendRoute,
  sessionAttendanceRoute,

  // Calendar
  sessionIcsRoute,
  sessionGoogleCalRoute,
  createUserCal,
  getUserCal,

  // Content
  getContentRoute,

  // Registration
  getRegistrationRoute,

  // Metrics
  metricRoute,
];
