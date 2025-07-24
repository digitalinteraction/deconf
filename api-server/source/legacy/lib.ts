import { HTTPError, loader, SqlDependency, Store } from "gruber";
import * as deconf from "@openlab/deconf-shared";

import {
  ConferenceTable,
  ContentTable,
  getOrInsert,
  LabelTable,
  PersonTable,
  RegistrationTable,
  SessionLabelTable,
  SessionLinkTable,
  SessionPersonTable,
  SessionSaveTable,
  SessionTable,
  TaxonomyTable,
  useDatabase,
} from "../lib/mod.js";
import {
  ConferenceRecord,
  LabelRecord,
  PersonRecord,
  SessionRecord,
  TaxonomyRecord,
} from "../lib/types.js";

function assertInteger(input: number | string) {
  const value = typeof input === "string" ? parseInt(input) : input;
  if (Number.isNaN(value)) throw HTTPError.badRequest("bad url identifier");
  return value;
}

const fakeSettings: deconf.ConferenceConfig = {
  atrium: { enabled: true, visible: true },
  schedule: { enabled: true, visible: true },
  helpDesk: { enabled: true, visible: true },
  about: { enabled: true, visible: true },
  navigation: {},
  widgets: {},
} as any;

export class LegacyRepo {
  static use = loader(() => new this(useDatabase()));

  sql: SqlDependency;
  constructor(sql: SqlDependency) {
    this.sql = sql;
  }

  with(sql: SqlDependency) {
    return new LegacyRepo(sql);
  }

  getConference(id: number): Promise<ConferenceRecord | null> {
    return ConferenceTable.selectOne(this.sql, this.sql`id = ${id}`);
  }

  async assertConference(id: number | string) {
    const record = await this.getConference(assertInteger(id));
    if (!record) throw HTTPError.notFound();
    return record;
  }

  listSessions(confId: number): Promise<SessionRecord[]> {
    return SessionTable.select(
      this.sql,
      this.sql`
      conference_id = ${confId} AND state != 'draft'
    `,
    );
  }

  // TODO: could be more efficient
  async listTaxonomies(confId: number): Promise<TaxonomyDetails[]> {
    const records = await TaxonomyTable.select(
      this.sql,
      this.sql`conference_id = ${confId}`,
    );
    const taxonomies = records as TaxonomyDetails[];
    for (const tax of taxonomies) {
      tax.labels = await this.listLabels(tax.id);
    }
    return taxonomies;
  }

  listLabels(taxId: number) {
    return LabelTable.select(this.sql, this.sql`taxonomy_id = ${taxId}`);
  }

  listSessionLinks(sessionId: number) {
    return SessionLinkTable.select(
      this.sql,
      this.sql`session_id = ${sessionId}`,
    );
  }

  listPeople(conferenceId: number) {
    return PersonTable.select(
      this.sql,
      this.sql`conference_id = ${conferenceId}`,
    );
  }

  async getGroupedPeople(conferenceId: number) {
    const all = await PersonTable.select(
      this.sql,
      this.sql`conference_id = ${conferenceId}`,
    );
    const relations = await SessionPersonTable.select(
      this.sql,
      this.sql`person_id IN ${this.sql(all.map((r) => r.id))}`,
    );
    const lookup = new Map(all.map((p) => [p.id, p]));
    const grouped = new Map<number, PersonRecord[]>();
    for (const record of relations) {
      getOrInsert(grouped, record.session_id, []).push(
        lookup.get(record.person_id)!,
      );
    }
    return { all, grouped };
  }

  async getGroupedLabels(conferenceId: number) {
    const taxonomies = await this.listTaxonomies(conferenceId);
    const labels = taxonomies.flatMap((t) => t.labels);
    const lookup = new Map(labels.map((l) => [l.id, l]));

    const relations = await SessionLabelTable.select(
      this.sql,
      this.sql`label_id IN ${this.sql(labels.map((l) => l.id))}`,
    );

    const grouped = new Map<number, LabelRecord[]>();
    for (const record of relations) {
      getOrInsert(grouped, record.session_id, []).push(
        lookup.get(record.label_id)!,
      );
    }

    return { grouped };
  }

  getSession(sessionId: number, conferenceId: number) {
    return SessionTable.selectOne(
      this.sql,
      this.sql`id = ${sessionId} AND conference_id = ${conferenceId}`,
    );
  }

  async assertSession(
    sessionId: number | string,
    conferenceId: number | string,
  ) {
    const record = await this.getSession(
      assertInteger(sessionId),
      assertInteger(conferenceId),
    );
    if (!record) throw HTTPError.notFound();
    return record;
  }

  getRegistration(userId: number, conferenceId: number) {
    return RegistrationTable.selectOne(
      this.sql,
      this.sql`user_id = ${userId} AND conference_id = ${conferenceId}`,
    );
  }

  async assertRegistration(
    userId: number | string,
    conferenceId: number | string,
  ) {
    const record = await this.getRegistration(
      assertInteger(userId),
      assertInteger(conferenceId),
    );
    if (!record) throw HTTPError.notFound();
    return record;
  }

  async listUserSessions(registrationId: number) {
    const relation = await SessionSaveTable.select(
      this.sql,
      this.sql`registration_id = ${registrationId}`,
    );
    return SessionTable.select(
      this.sql,
      this.sql`id IN ${this.sql(relation.map((r) => r.id))}`,
    );
  }

  async getSettings(conferenceId: number): Promise<deconf.ConferenceConfig> {
    const record = await ContentTable.selectOne(
      this.sql,
      this.sql`
        slug = 'settings' AND content_type = 'application/json' AND conference_id = ${conferenceId}
      `,
    );
    if (!record) return fakeSettings;
    return JSON.parse(record.body.en!);
  }
}

// export async function getConference(
//   sql: Sql,
//   id: string | number,
// ): Promise<ConferenceRecord | null> {
//   const [record = null] = await sql<ConferenceRecord[]>`
//     SELECT id, created, slug, title, metadata
//     FROM conferences
//     WHERE id = ${assertInteger(id)}
//   `;
//   return record;
// }

// export async function assertConference(
//   sql: Sql,
//   conference: string | number,
// ): Promise<ConferenceRecord> {
//   const record = await getConference(sql, conference);
//   if (!record) throw HTTPError.notFound("conference not found");
//   return record;
// }

// export function getSessions(
//   sql: Sql,
//   conference: number,
// ): Promise<SessionRecord[]> {
//   return sql<SessionRecord[]>`
//     SELECT id, created, title, summary, details, languages, state, start, "end", conference_id
//     FROM sessions
//     WHERE conference_id = ${assertInteger(conference)}
//   `;
// }

export interface TaxonomyDetails extends TaxonomyRecord {
  labels: LabelRecord[];
}

// export async function getTaxonomies(
//   sql: Sql,
//   conference: number,
// ): Promise<TaxonomyDetails[]> {
//   const taxonomies = await sql<TaxonomyDetails[]>`
//     SELECT id, created, title, icon, conference_id
//     FROM taxonomies
//     WHERE conference_id = ${assertInteger(conference)}
//   `;
//   for (const tax of taxonomies) {
//     tax.labels = await getLabels(sql, tax.id);
//   }
//   return taxonomies;
// }

// export function getLabels(sql: Sql, taxonomy: number): Promise<LabelRecord[]> {
//   return sql<LabelRecord[]>`
//     SELECT id, created, title, icon, taxonomy_id
//     FROM labels
//     WHERE taxonomy_id = ${assertInteger(taxonomy)}
//   `;
// }

// export function getSessionLinks(
//   sql: Sql,
//   session: number | string,
// ): Promise<SessionLinkRecord[]> {
//   return sql<SessionLinkRecord[]>`
//     SELECT id, created, title, url, language, session_id
//     FROM session_links
//     WHERE session_id = ${assertInteger(session)}
//   `;
// }

// export function getConferencePeople(sql: Sql, conference: number) {
//   return sql<PersonRecord[]>`
//     SELECT id, created, name, subtitle, bio, conference_id
//     FROM people
//     WHERE conference_id = ${assertInteger(conference)}
//   `;
// }

// export async function getSessionPeople(sql: Sql, conference: number) {
//   const all = await getConferencePeople(sql, conference);
//   const lookup = new Map(all.map((p) => [p.id, p]));

//   const relations = await sql<{ session_id: number; person_id: number }[]>`
//     SELECT id, created, session_id, person_id
//     FROM session_people
//     WHERE person_id IN ${sql(all.map((p) => p.id))}
//   `;

//   const mapped = new Map<number, PersonRecord[]>();

//   for (const record of relations) {
//     mapped.set(
//       record.session_id,
//       (mapped.get(record.session_id) ?? []).concat(
//         lookup.get(record.person_id)!,
//       ),
//     );
//   }
//   return { all, mapped };
// }

// export async function getSessionLabels(sql: Sql, conference: number) {
//   const taxonomies = await getTaxonomies(sql, conference);
//   const labels = taxonomies.flatMap((t) => t.labels);
//   const lookup = new Map(labels.map((l) => [l.id, l]));

//   const relations = await sql<{ session_id: number; label_id: number }[]>`
//     SELECT id, created, session_id, label_id
//     FROM session_labels
//     WHERE label_id IN ${sql(labels.map((l) => l.id))}
//   `;

//   const mapped = new Map<number, LabelRecord[]>();

//   for (const record of relations) {
//     mapped.set(
//       record.session_id,
//       (mapped.get(record.session_id) ?? []).concat(
//         lookup.get(record.label_id)!,
//       ),
//     );
//   }

//   return { mapped };
// }

// export async function getSession(sql: Sql, session: number | string) {
//   const [record = null] = await sql<SessionRecord[]>`
//     SELECT id, created, title, summary, details, languages, state, start, 'end', conference_id
//     FROM sessions
//     WHERE id = ${assertInteger(session)}
//   `;
//   return record;
// }

// export async function assertSession(
//   sql: Sql,
//   session: number | string,
//   conference: string | number,
// ) {
//   const record = await getSession(sql, session);

//   if (!record) throw HTTPError.notFound("session not found");
//   if (
//     typeof conference !== undefined &&
//     record.conference_id !== assertInteger(conference)
//   ) {
//     throw HTTPError.notFound("session not found");
//   }
//   return record;
// }

// export async function getRegistration(
//   sql: Sql,
//   user: number,
//   conference: number | string,
// ) {
//   const [record = null] = await sql<RegistrationRecord[]>`
//     SELECT id, created, name, user_id, conference_id, role
//     FROM registrations
//     WHERE user_id = ${user}
//       AND conference_id = ${assertInteger(conference)}
//   `;
//   return record;
// }

// export async function assertRegistration(
//   sql: Sql,
//   user: number,
//   conference: number | string,
// ) {
//   const record = await getRegistration(sql, user, conference);
//   if (!record) throw HTTPError.unauthorized("not registered for conference");
//   return record;
// }

// Wrap some code in a cached key in the store to limit execution
export async function cache<T>(
  store: Store,
  key: string,
  maxAge: number,
  block: () => Promise<T | undefined>,
): Promise<T | undefined> {
  let value = await store.get<T>(key);
  if (value === undefined) {
    value = await block();
    if (value !== undefined) {
      await store.set(key, value, { maxAge });
    }
  }
  return value;
}

export class LegacyApiError extends HTTPError {
  static async wrap<T>(fn: () => T) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HTTPError) {
        throw LegacyApiError.from(error);
      }
      throw error;
    }
  }

  static from(value: HTTPError) {
    return new LegacyApiError(
      value.status,
      value.statusText,
      value.body,
      value.headers,
    );
  }

  override toResponse(): Response {
    return Response.json(
      {
        message: this.statusText,
        codes: [],
      },
      {
        headers: this.headers,
        status: this.status,
        statusText: this.statusText,
      },
    );
  }
}
