import * as deconf from "@openlab/deconf-shared";
import { HTTPError, loader, SqlDependency, Store } from "gruber";

import {
  AssetRecord,
  AssetTable,
  ConferenceRecord,
  ConferenceTable,
  ContentTable,
  getOrInsert,
  LabelRecord,
  LabelTable,
  PersonRecord,
  PersonTable,
  RegistrationTable,
  SessionLabelTable,
  SessionLinkTable,
  SessionPersonTable,
  SessionRecord,
  SessionSaveTable,
  SessionTable,
  TaxonomyRecord,
  TaxonomyTable,
  useDatabase,
} from "../lib/mod.ts";

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

  async getAssetsMap(conferenceId: number): Promise<Map<number, AssetRecord>> {
    const records = await AssetTable.select(
      this.sql,
      this.sql`conference_id = ${conferenceId}`,
    );
    return new Map(records.map((r) => [r.id, r]));
  }
}

export interface TaxonomyDetails extends TaxonomyRecord {
  labels: LabelRecord[];
}

// Wrap some code in cached under key in the store to limit execution
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

/**
 * A custom HTTPError wrapper for legacy deconf routes.
 * Due to several deconf bugs those HTTP errors need to return a HTTP/200 and include valid JSON.
 * This class wraps HTTPErrors that are thrown and reformats so they don't break the legacy deconf client.
 */
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
        message: `${this.status} - ${this.statusText}`,
        codes: [],
      },
      {
        headers: this.headers,
      },
    );
  }
}
