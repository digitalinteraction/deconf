import * as deconf from '@openlab/deconf-shared'
import { defineRoute } from 'gruber'
import { useDatabase } from '../lib/database.js'
import { useAuthentication } from '../lib/authorization.js'
import {
  assertConference,
  assertRegistration,
  assertSession,
  getRegistration,
} from './lib.js'
import { Sql } from 'postgres'
import { SessionSaveRecord } from '../lib/types.js'

async function addAttendance(sql: Sql, registration: number, session: number) {
  await sql`
    INSERT INTO session_saves ${sql({
      registration_id: registration,
      session_id: session,
    })}
  `
}

async function clearAttendance(
  sql: Sql,
  registration: number,
  session: number,
) {
  await sql`
    DELETE FROM session_saves
    WHERE registration_id = ${registration}
      AND session_id = ${session}
  `
}

// Attendance - attend
export const attendRoute = defineRoute({
  method: 'POST',
  pathname: '/legacy/:conference/attendance/:session/attend',
  async handler({ request, params }) {
    const authn = useAuthentication()
    const { userId } = await authn.assertUser(request, {
      scope: 'legacy:attendance',
    })

    const sql = useDatabase()
    const session = await assertSession(sql, params.session, params.conference)

    const registration = await assertRegistration(
      sql,
      userId,
      params.conference,
    )

    await clearAttendance(sql, registration.id, session.id)
    await addAttendance(sql, registration.id, session.id)

    return new Response()
  },
})

// Attendance - unattend
export const unattendRoute = defineRoute({
  method: 'POST',
  pathname: '/legacy/:conference/attendance/:session/unattend',
  async handler({ request, params }) {
    const authn = useAuthentication()
    const { userId } = await authn.assertUser(request, {
      scope: 'legacy:attendance',
    })

    const sql = useDatabase()
    const session = await assertSession(sql, params.session, params.conference)

    const registration = await assertRegistration(
      sql,
      userId,
      params.conference,
    )

    await clearAttendance(sql, registration.id, session.id)

    return new Response()
  },
})

async function getUserAttendance(sql: Sql, registration: number) {
  return sql<SessionSaveRecord[]>`
    SELECT id, created, session_id, registration_id
    FROM session_saves
    WHERE registration_id = ${registration}
  `
}

async function getSessionAttendance(sql: Sql, session: number) {
  return sql<SessionSaveRecord[]>`
    SELECT id, created, session_id, registration_id
    FROM session_saves
    WHERE session_id = ${session}
  `
}

// Attendance - getSession
export const sessionAttendanceRoute = defineRoute({
  method: 'GET',
  pathname: '/legacy/:conference/attendance/:session',
  async handler({ request, params }) {
    const authn = useAuthentication()
    const token = await authn.getAuthorization(request)

    const sql = useDatabase()
    const session = await assertSession(sql, params.session, params.conference)
    const registration = token?.userId
      ? await getRegistration(sql, token.userId, params.conference)
      : null

    const attendance = await getSessionAttendance(sql, session.id)

    return Response.json({
      isAttending: registration
        ? attendance.some((r) => r.registration_id === registration.id)
        : false,
      sessionCount: attendance.length,
    })
  },
})

function convertAttendance(record: SessionSaveRecord): deconf.Attendance {
  return {
    id: record.id,
    created: record.created,
    attendee: record.registration_id,
    session: record.session_id.toString(),
  }
}

// Attendance - getSelf
export const selfAttendanceRoute = defineRoute({
  method: 'GET',
  pathname: '/legacy/:conference/attendance/me',
  async handler({ request, params }) {
    const authn = useAuthentication()
    const { userId } = await authn.assertUser(request, {
      scope: 'legacy:attendance',
    })

    const sql = useDatabase()
    const registration = await assertRegistration(
      sql,
      userId,
      params.conference,
    )

    const records = await getUserAttendance(sql, registration.id)

    return Response.json({
      attendance: records.map((r) => convertAttendance(r)),
    })
  },
})
