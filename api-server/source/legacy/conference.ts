import { defineRoute, HTTPError } from 'gruber'
import {
  SessionLinkRecord,
  PersonRecord,
  SessionRecord,
  useDatabase,
  LabelRecord,
  useAuthentication,
  useStore,
  KeyValueStore,
  Cachable,
} from '../lib/mod.js'
import {
  assertConference,
  getSession,
  getSessionLabels,
  getSessionLinks,
  getSessionPeople,
  getSessions,
  getTaxonomies,
  TaxonomyDetails,
} from './lib.js'

import * as deconf from '@openlab/deconf-shared'
import { log } from 'console'
import { Sql } from 'postgres'

function convertSessionState(state: string): deconf.SessionState {
  if (state === 'accepted') return deconf.SessionState.accepted
  if (state === 'confirmed') return deconf.SessionState.confirmed
  return deconf.SessionState.draft
}

function convertSlot(record: SessionRecord): deconf.SessionSlot | null {
  if (!record.start || !record.end) return null

  return {
    id: record.start.getTime() + '_' + record.end.getTime(),
    start: record.start,
    end: record.end,
  }
}

function convertPerson(record: PersonRecord): deconf.Speaker {
  return {
    id: record.id.toString(),
    name: record.name,
    role: { en: record.subtitle },
    bio: record.bio,
    // TODO: headshots x avatars
  }
}

function convertSession(
  record: SessionRecord,
  taxonomies: TaxonomyDetails[],
  people: PersonRecord[] = [],
  labels: LabelRecord[] = [],
): deconf.Session {
  const labelIds = new Set(labels.map((l) => l.id))

  const themes = getLegacyTax(taxonomies, 'theme').filter((t) =>
    labelIds.has(t.id),
  )
  const tracks = getLegacyTax(taxonomies, 'track').filter((t) =>
    labelIds.has(t.id),
  )
  const types = getLegacyTax(taxonomies, 'type').filter((t) =>
    labelIds.has(t.id),
  )

  return {
    id: record.id.toString(),
    type: types.map((t) => convertLabel(t).id)[0],
    slot: convertSlot(record)?.id,
    track: tracks.map((t) => convertLabel(t).id)[0],
    themes: themes.map((t) => convertLabel(t).id),
    coverImage: undefined,
    title: record.title,
    content: record.details,
    links: [],
    hostLanguages: record.languages.split(','),
    enableInterpretation: false,
    speakers: people.map((person) => convertPerson(person).id),
    hostOrganisation: {},
    isRecorded: false,
    isOfficial: false,
    isFeatured: false,
    visibility: deconf.SessionVisibility.public,
    state: convertSessionState(record.state),
    participantCap: null,

    hideFromSchedule: false,
  }
}

function convertLabel(record: LabelRecord): deconf.SessionType {
  return {
    id: record.id.toString(),
    title: record.title,
    iconGroup: 'fas',
    iconName: 'lightbulb',
    layout: 'plenary',
  }
}

export async function getSchedule(
  sql: Sql,
  conference: number,
): Promise<deconf.ScheduleRecord> {
  const sessions = await getSessions(sql, conference)
  const people = await getSessionPeople(sql, conference)
  const taxonomies = await getTaxonomies(sql, conference)
  const labels = await getSessionLabels(sql, conference)

  const slots = new Map(
    sessions
      .map((s) => convertSlot(s))
      .filter((slot) => slot)
      .map((slot) => [slot!.id, slot!]),
  )

  const theme = getLegacyTax(taxonomies, 'theme')
  const track = getLegacyTax(taxonomies, 'track')
  const type = getLegacyTax(taxonomies, 'type')

  // TODO: things need injecting onto the "SessionType" records
  // TODO: what to do with settings ...

  return {
    sessions: sessions.map((s) =>
      convertSession(
        s,
        taxonomies,
        people.mapped.get(s.id),
        labels.mapped.get(s.id),
      ),
    ),
    settings: {} as any,
    slots: Array.from(slots.values()),
    speakers: Array.from(people.all).map((p) => convertPerson(p)),
    themes: theme.map((l) => convertLabel(l)),
    tracks: track.map((l) => convertLabel(l)),
    types: type.map((l) => convertLabel(l)),
  }
}

type ScheduleCache = [`/legacy/${number}/schedule`, deconf.ScheduleRecord]

// Conference - getSchedule
export const getScheduleRoute = defineRoute({
  method: 'GET',
  pathname: '/legacy/:conference/schedule',
  async handler({ params }) {
    const sql = useDatabase()
    const store = await useStore()
    const conf = await assertConference(sql, params.conference)

    // Cache the schedule in redis for 5 minutes
    const schedule = await cache<ScheduleCache>(
      store,
      `/legacy/${conf.id}/schedule`,
      5 * 60,
      () => getSchedule(sql, conf.id),
    )

    return Response.json(schedule)
  },
})

// Wrap some code in a cached key in the store to limit execution
async function cache<T extends Cachable>(
  store: KeyValueStore,
  key: T[0],
  duration: number,
  block: () => Promise<T[1]>,
) {
  let value = await store.get(key)
  if (!value) {
    value = await block()
    await store.set(key, value, { duration })
  }
  return value
}

function getLegacyTax(
  taxonomies: TaxonomyDetails[],
  kind: 'theme' | 'track' | 'type',
) {
  return (
    taxonomies.find((t) => t.title?.en?.toLowerCase() === kind)?.labels ?? []
  )
}

function convertLink(link: SessionLinkRecord): deconf.LocalisedLink {
  return {
    type: '',
    url: link.url,
    title: link.title?.en,
    language: link.language,
  }
}

// 30 minutes
const LINKS_GRACE_MS = 30 * 60 * 1000

// Conference - getLinks
export const getSessionLinksRoute = defineRoute({
  method: 'GET',
  pathname: '/legacy/:conference/schedule/:session/links',
  async handler({ request, params }) {
    const authn = useAuthentication()
    const { scope } = await authn.assertUser(request, {
      scope: 'legacy:conference',
    })

    const sql = useDatabase()
    const links = await getSessionLinks(sql, params.session)

    const session = await getSession(sql, params.session)
    if (!session?.start) throw HTTPError.notFound()

    // TODO: participantCap has been removed

    const isAdmin = authn.checkScope(scope, 'admin')
    const timeUntil = session.start.getTime() - Date.now()
    if (!isAdmin && timeUntil > LINKS_GRACE_MS) {
      throw HTTPError.unauthorized()
    }

    return Response.json({
      links: links.map((l) => convertLink(l)),
    })
  },
})
