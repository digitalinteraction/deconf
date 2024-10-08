import { defineRoute, HTTPError } from 'gruber'
import ics from 'ics'
import {
  SessionRecord,
  useAuthentication,
  useDatabase,
  useTokenService,
} from '../lib/mod.js'
import { assertRegistration, assertSession } from './lib.js'
import { appConfig } from '../config.js'
import { Sql } from 'postgres'

function getIcsDate(date: Date) {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ] as [number, number, number, number, number]
}

// TODO: how to calculate the session URL
function getSessionIcsOptions(session: SessionRecord) {
  if (!session.start || !session.end) throw HTTPError.notFound()
  return {
    start: getIcsDate(session.start),
    startInputType: 'utc',
    end: getIcsDate(session.end),
    endInputType: 'utc',
    title: session.title.en,
    description: session.summary.en,
    location: 'TODO: ',
    calName: appConfig.meta.name,
  } as const
}

function assertIcs(file: ics.ReturnObject) {
  if (!file.value) {
    console.error('ICS error', file.error)
    throw HTTPError.internalServerError('failed to generate session ics')
  }
  return file.value
}

function getSessionIcs(session: SessionRecord) {
  return assertIcs(ics.createEvent(getSessionIcsOptions(session)))
}

function getSessionsIcal(sessions: SessionRecord[]) {
  return assertIcs(
    ics.createEvents(
      sessions
        .filter((s) => s.start && s.end)
        .map((s) => getSessionIcsOptions(s)),
    ),
  )
}

function padStart(input: number, zeros: number) {
  return input.toString().padStart(zeros, '0')
}

function getGoogleDate(input: Date) {
  return [
    input.getUTCFullYear(),
    padStart(input.getUTCMonth() + 1, 2),
    padStart(input.getUTCDate(), 2),
    'T',
    padStart(input.getUTCHours(), 2),
    padStart(input.getUTCMinutes(), 2),
    padStart(input.getUTCSeconds(), 2),
    'Z',
  ].join('')
}

function getSessionGoogleCalUrl(session: SessionRecord) {
  if (!session.start || !session.end) throw HTTPError.notFound()

  const url = new URL('https://calendar.google.com/event')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set(
    'dates',
    `${getGoogleDate(session.start)}/${getGoogleDate(session.end)}`,
  )
  url.searchParams.set('text', session.title.en ?? '')

  // TODO: how to calculate the session URL
  // url.searchParams.set(
  //   'location',
  //   this.#context.url.getSessionLink(session.id).toString(),
  // )

  return url
}

// Calendar - getSessionIcs
export const sessionIcsRoute = defineRoute({
  method: 'GET',
  pathname: '/legacy/:conference/calendar/ical/:session',
  async handler({ params }) {
    // TODO: locale is no longer mapped from authz token
    // maybe parse from Accept-Language header ?

    const sql = useDatabase()
    console.log(params)

    const session = await assertSession(sql, params.session, params.conference)

    return new Response(getSessionIcs(session), {
      headers: {
        'Content-Type': 'text/calendar',
        'content-disposition': `attachment; filename="session.ics`,
      },
    })
  },
})

// Calendar - getSessionGoogle
export const sessionGoogleCalRoute = defineRoute({
  method: 'GET',
  pathname: '/legacy/:conference/calendar/google/:session',
  async handler({ request, params }) {
    const sql = useDatabase()
    const session = await assertSession(sql, params.session, params.conference)

    return Response.redirect(getSessionGoogleCalUrl(session))
  },
})

// Calendar - createUserCal
export const createUserCal = defineRoute({
  method: 'GET',
  pathname: '/legacy/:conference/calendar/me',
  async handler({ request, params }) {
    const authn = useAuthentication()
    const { userId } = await authn.assertUser(request, {
      scope: 'legacy:calendar',
    })

    const sql = useDatabase()
    await assertRegistration(sql, userId, params.conference)

    const tokens = useTokenService()
    const token = await tokens.sign(userId, 'legacy:calendar:self')

    return Response.redirect(
      new URL(
        `./legacy/${params.conference}/calendar/me/${token}`,
        appConfig.locations.self,
      ),
    )
  },
})

function getUserSessions(sql: Sql, registration: number, conference: number) {
  return sql<SessionRecord[]>`
    SELECT id, created, title, summary, details, languages, state, start, 'end', conference_id
    FROM sessions
    WHERE conference_id = ${conference}
      AND id IN (
        SELECT id FROM session_saves WHERE registration = ${registration}
      )
  `
}

// Calendar - getUserIcs
export const getUserCal = defineRoute({
  method: 'GET',
  pathname: '/legacy/:conference/calendar/me/:token',
  async handler({ params }) {
    const tokens = useTokenService()

    const token = await tokens.verify(params.token)
    if (!token?.userId) throw HTTPError.unauthorized()

    const sql = useDatabase()
    const registration = await assertRegistration(
      sql,
      token.userId,
      params.conference,
    )

    const sessions = await getUserSessions(
      sql,
      registration.id,
      registration.conference_id,
    )

    return new Response(getSessionsIcal(sessions), {
      headers: {
        'Content-Type': 'text/calendar',
        'content-disposition': `attachment; filename="session.ics`,
      },
    })
  },
})
