// ...

import {
  attendRoute,
  selfAttendanceRoute,
  sessionAttendanceRoute,
  unattendRoute,
} from './attendance.js'
import {
  createUserCal,
  getUserCal,
  sessionGoogleCalRoute,
  sessionIcsRoute,
} from './calendar.js'
import { getSessionLinksRoute, getScheduleRoute } from './conference.js'
import { getContentRoute } from './content.js'

export default [
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
]
