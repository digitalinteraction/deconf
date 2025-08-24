import * as deconf from "@openlab/deconf-shared";
import { defineRoute, loader, SqlDependency } from "gruber";

import {
  SessionSaveRecord,
  SessionSaveTable,
  useAuthz,
  useDatabase,
} from "../lib/mod.ts";
import { LegacyApiError, LegacyRepo } from "./legacy-lib.ts";

export class AttendanceRepo {
  static use = loader(() => new this(useDatabase()));

  sql: SqlDependency;
  constructor(sql: SqlDependency) {
    this.sql = sql;
  }

  with(sql: SqlDependency) {
    return new AttendanceRepo(sql);
  }

  // Remove attendance for a session, including duplicates
  async removeAttendance(registrationId: number, sessionId: number) {
    await SessionSaveTable.delete(
      this.sql,
      this
        .sql`registration_id = ${registrationId} AND session_id = ${sessionId}`,
    );
  }

  async addAttendance(registrationId: number, sessionId: number) {
    await SessionSaveTable.insertOne(this.sql, {
      session_id: sessionId,
      registration_id: registrationId,
    });
  }

  getUserAttendance(registrationId: number) {
    return SessionSaveTable.select(
      this.sql,
      this.sql`registration_id = ${registrationId}`,
    );
  }

  getSessionAttendance(sessionId: number) {
    return SessionSaveTable.select(
      this.sql,
      this.sql`session_id = ${sessionId}`,
    );
  }
}

// Attendance - attend
export const attendRoute = defineRoute({
  method: "POST",
  pathname: "/legacy/:conference/attendance/:session/attend",
  dependencies: {
    authz: useAuthz,
    legacy: LegacyRepo.use,
    attendance: AttendanceRepo.use,
  },
  async handler({ request, params, authz, legacy, attendance }) {
    return LegacyApiError.wrap(async () => {
      const { userId } = await authz.assertUser(request, {
        scope: "user:legacy:attendance",
      });

      const session = await legacy.assertSession(
        params.session,
        params.conference,
      );

      const registration = await legacy.assertRegistration(
        userId,
        params.conference,
      );

      await attendance.removeAttendance(registration.id, session.id);
      await attendance.addAttendance(registration.id, session.id);

      return new Response();
    });
  },
});

// Attendance - unattend
export const unattendRoute = defineRoute({
  method: "POST",
  pathname: "/legacy/:conference/attendance/:session/unattend",
  dependencies: {
    authz: useAuthz,
    legacy: LegacyRepo.use,
    attendance: AttendanceRepo.use,
  },
  async handler({ request, params, authz, legacy, attendance }) {
    return LegacyApiError.wrap(async () => {
      const { userId } = await authz.assertUser(request, {
        scope: "user:legacy:attendance",
      });

      const session = await legacy.assertSession(
        params.session,
        params.conference,
      );

      const registration = await legacy.assertRegistration(
        userId,
        params.conference,
      );

      await attendance.removeAttendance(registration.id, session.id);

      return new Response();
    });
  },
});

// Attendance - getSession
export const sessionAttendanceRoute = defineRoute({
  method: "GET",
  pathname: "/legacy/:conference/attendance/:session",
  dependencies: {
    authz: useAuthz,
    legacy: LegacyRepo.use,
    attendance: AttendanceRepo.use,
  },
  async handler({ request, params, authz, legacy, attendance }) {
    return LegacyApiError.wrap(async () => {
      const token = await authz.assert(request);

      const session = await legacy.assertSession(
        params.session,
        params.conference,
      );
      const registration =
        token.kind === "user"
          ? await legacy.assertRegistration(token.userId, params.conference)
          : null;

      const records = await attendance.getSessionAttendance(session.id);

      return Response.json({
        isAttending: registration
          ? records.some((r) => r.registration_id === registration.id)
          : false,
        sessionCount: records.length,
      });
    });
  },
});

function convertAttendance(record: SessionSaveRecord): deconf.Attendance {
  return {
    id: record.id,
    created: record.created_at,
    attendee: record.registration_id,
    session: record.session_id.toString(),
  };
}

// Attendance - getSelf
export const selfAttendanceRoute = defineRoute({
  method: "GET",
  pathname: "/legacy/:conference/attendance/me",
  dependencies: {
    authz: useAuthz,
    legacy: LegacyRepo.use,
    attendance: AttendanceRepo.use,
  },
  async handler({ request, params, authz, legacy, attendance }) {
    return LegacyApiError.wrap(async () => {
      const { userId } = await authz.assertUser(request, {
        scope: "user:legacy:attendance",
      });

      const registration = await legacy.assertRegistration(
        userId,
        params.conference,
      );

      const records = await attendance.getUserAttendance(registration.id);

      return Response.json({
        attendance: records.map((r) => convertAttendance(r)),
      });
    });
  },
});
