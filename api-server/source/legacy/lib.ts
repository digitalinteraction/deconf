import { Sql } from 'postgres'
import {
  ConferenceRecord,
  LabelRecord,
  PersonRecord,
  RegistrationRecord,
  SessionLinkRecord,
  SessionPersonRecord,
  SessionRecord,
  TaxonomyRecord,
} from '../lib/types.js'
import { HTTPError } from 'gruber'
import { Cachable, KeyValueStore } from '../lib/mod.js'

function assertInteger(input: number | string) {
  const value = typeof input === 'string' ? parseInt(input) : input
  if (Number.isNaN(value)) throw HTTPError.badRequest('bad url identifier')
  return value
}

export async function getConference(
  sql: Sql,
  id: string | number,
): Promise<ConferenceRecord | null> {
  const [record = null] = await sql<ConferenceRecord[]>`
    SELECT id, created, slug, title, metadata
    FROM conferences
    WHERE id = ${assertInteger(id)}
  `
  return record
}

export async function assertConference(
  sql: Sql,
  conference: string | number,
): Promise<ConferenceRecord> {
  const record = await getConference(sql, conference)
  if (!record) throw HTTPError.notFound('conference not found')
  return record
}

export function getSessions(
  sql: Sql,
  conference: number,
): Promise<SessionRecord[]> {
  return sql<SessionRecord[]>`
    SELECT id, created, title, summary, details, languages, state, start, "end", conference_id
    FROM sessions
    WHERE conference_id = ${assertInteger(conference)}
  `
}

export interface TaxonomyDetails extends TaxonomyRecord {
  labels: LabelRecord[]
}

export async function getTaxonomies(
  sql: Sql,
  conference: number,
): Promise<TaxonomyDetails[]> {
  const taxonomies = await sql<TaxonomyDetails[]>`
    SELECT id, created, title, icon, conference_id
    FROM taxonomies
    WHERE conference_id = ${assertInteger(conference)}
  `
  for (const tax of taxonomies) {
    tax.labels = await getLabels(sql, tax.id)
  }
  return taxonomies
}

export function getLabels(sql: Sql, taxonomy: number): Promise<LabelRecord[]> {
  return sql<LabelRecord[]>`
    SELECT id, created, title, icon, taxonomy_id
    FROM labels
    WHERE taxonomy_id = ${assertInteger(taxonomy)}
  `
}

export function getSessionLinks(
  sql: Sql,
  session: number | string,
): Promise<SessionLinkRecord[]> {
  return sql<SessionLinkRecord[]>`
    SELECT id, created, title, url, language, session_id
    FROM session_links
    WHERE session_id = ${assertInteger(session)}
  `
}

export function getConferencePeople(sql: Sql, conference: number) {
  return sql<PersonRecord[]>`
    SELECT id, created, name, subtitle, bio, conference_id
    FROM people
    WHERE conference_id = ${assertInteger(conference)}
  `
}

export async function getSessionPeople(sql: Sql, conference: number) {
  const all = await getConferencePeople(sql, conference)
  const lookup = new Map(all.map((p) => [p.id, p]))

  const relations = await sql<{ session_id: number; person_id: number }[]>`
    SELECT id, created, session_id, person_id
    FROM session_people
    WHERE person_id IN ${sql(all.map((p) => p.id))}
  `

  const mapped = new Map<number, PersonRecord[]>()

  for (const record of relations) {
    mapped.set(
      record.session_id,
      (mapped.get(record.session_id) ?? []).concat(
        lookup.get(record.person_id)!,
      ),
    )
  }
  return { all, mapped }
}

export async function getSessionLabels(sql: Sql, conference: number) {
  const taxonomies = await getTaxonomies(sql, conference)
  const labels = taxonomies.flatMap((t) => t.labels)
  const lookup = new Map(labels.map((l) => [l.id, l]))

  const relations = await sql<{ session_id: number; label_id: number }[]>`
    SELECT id, created, session_id, label_id
    FROM session_labels
    WHERE label_id IN ${sql(labels.map((l) => l.id))}
  `

  const mapped = new Map<number, LabelRecord[]>()

  for (const record of relations) {
    mapped.set(
      record.session_id,
      (mapped.get(record.session_id) ?? []).concat(
        lookup.get(record.label_id)!,
      ),
    )
  }

  return { mapped }
}

export async function getSession(sql: Sql, session: number | string) {
  const [record = null] = await sql<SessionRecord[]>`
    SELECT id, created, title, summary, details, languages, state, start, 'end', conference_id
    FROM sessions
    WHERE id = ${assertInteger(session)}
  `
  return record
}

export async function assertSession(
  sql: Sql,
  session: number | string,
  conference: string | number,
) {
  const record = await getSession(sql, session)

  if (!record) throw HTTPError.notFound('session not found')
  if (
    typeof conference !== undefined &&
    record.conference_id !== assertInteger(conference)
  ) {
    throw HTTPError.notFound('session not found')
  }
  return record
}

export async function getRegistration(
  sql: Sql,
  user: number,
  conference: number | string,
) {
  const [record = null] = await sql<RegistrationRecord[]>`
    SELECT id, created, name, user_id, conference_id, role
    FROM registrations
    WHERE user_id = ${user}
      AND conference_id = ${assertInteger(conference)}
  `
  return record
}

export async function assertRegistration(
  sql: Sql,
  user: number,
  conference: number | string,
) {
  const record = await getRegistration(sql, user, conference)
  if (!record) throw HTTPError.unauthorized('not registered for conference')
  return record
}

// Wrap some code in a cached key in the store to limit execution
export async function cache<T extends Cachable>(
  store: KeyValueStore,
  key: T[0],
  duration: number,
  block: () => Promise<T[1] | null>,
): Promise<T[1] | null> {
  let value = await store.get(key)
  if (!value) {
    value = await block()
    await store.set(key, value, { duration })
  }
  return value
}
