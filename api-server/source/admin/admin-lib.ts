import { HTTPError, SqlDependency, Structure } from "gruber";
import {
  assertRequestParam,
  AssetTable,
  ConferenceTable,
  ContentTable,
  LabelTable,
  PersonTable,
  RegistrationTable,
  SessionLabelTable,
  SessionLinkTable,
  SessionPersonTable,
  SessionTable,
  TableDefinition,
  TaxonomyTable,
  UserTable,
} from "../lib/mod.ts";

/** A structure to validate changes to users & registrations */
export const StagedRegistrations = Structure.object({
  users: Structure.array(
    Structure.object({
      id: Structure.string(),
      email: Structure.string(),
      consented_at: Structure.date(),
      metadata: Structure.any(),
    }),
  ),
  registrations: Structure.array(
    Structure.object({
      id: Structure.string(),
      avatar_id: Structure.union([Structure.string(), Structure.null()]),
      name: Structure.string(),
      role: Structure.union([
        Structure.literal("attendee"),
        Structure.literal("admin"),
      ]),
      user_id: Structure.string(),
      metadata: Structure.any(),
    }),
  ),
});

export async function _assertRegistrationData(
  sql: SqlDependency,
  conferenceId: string,
) {
  // Ensure the conference exists
  const conference = await ConferenceTable.selectOne(
    sql,
    sql`id = ${assertRequestParam(conferenceId)}`,
  );
  if (!conference) throw HTTPError.notFound();

  // Fetch information to start the diff
  const registrations = await RegistrationTable.select(
    sql,
    sql`conference_id = ${conference.id}`,
  );
  const users = await UserTable.select(
    sql,
    sql`id IN ${sql(registrations.map((r) => r.user_id))}`,
  );

  return { conference, registrations, users };
}

// Map an array of records to their raw ids, for use in an SQL query
export function getRecordIds(input: { id: number }[]) {
  return input.map((r) => r.id);
}

export type AdminConferenceData = ReturnType<typeof _assertConferenceData>;

/**
 * Get a conference and all associated data from the database
 */
export async function _assertConferenceData(
  sql: SqlDependency,
  confId: string | number,
) {
  // Get the conference and assert it exists or throw a http 404
  const conference = await ConferenceTable.selectOne(
    sql,
    sql`id = ${assertRequestParam(confId)}`,
  );
  if (!conference) throw HTTPError.notFound();

  const sessions = await SessionTable.select(
    sql,
    sql`conference_id = ${conference.id}`,
  );

  const people = await PersonTable.select(
    sql,
    sql`conference_id = ${conference.id}`,
  );

  const content = await ContentTable.select(
    sql,
    sql`conference_id = ${conference.id}`,
  );

  const taxonomies = await TaxonomyTable.select(
    sql,
    sql`conference_id = ${conference.id}`,
  );

  const labels = await LabelTable.select(
    sql,
    sql`taxonomy_id IN ${sql(getRecordIds(taxonomies))}`,
  );

  const sessionLinks = await SessionLinkTable.select(
    sql,
    sql`session_id IN ${sql(getRecordIds(sessions))}`,
  );

  const sessionPeople = await SessionPersonTable.select(
    sql,
    sql`session_id IN ${sql(getRecordIds(sessions))}`,
  );

  const sessionLabels = await SessionLabelTable.select(
    sql,
    sql`session_id IN ${sql(getRecordIds(sessions))}`,
  );

  const assets = await AssetTable.select(
    sql,
    sql`conference_id = ${conference.id}`,
  );

  return {
    conference,
    sessions,
    people,
    content,
    assets,

    taxonomies,
    labels,

    sessionLinks,
    sessionPeople,
    sessionLabels,
  };
}

/** Get a related value from a map with a hard throw if it is missing */
export function _getRelated<K, V>(map: Map<K, V>, key: K) {
  const value = map.get(key);
  if (!value) throw new Error("missing related value: " + key);
  return value;
}

/** An unwrapped diff, the records created and a map of temporary to real ids */
interface Unwraped<T> {
  lookup: Map<string, number>;
  records: T[];
}

export interface PerformDiffOptions {
  insert?: boolean;
  update?: boolean;
  delete?: boolean;
}

/**
 * Perform a diff against a {@link TableDefinition}
 * with a custom map method to decide how columns are arranged
 *
 * NOTE: I'd rather not depend on TableDefinition
 * NOTE: I also can't get it to type map's param properly
 */
export async function _performDiff<
  T extends { id: string },
  U extends { id: number },
>(
  sql: SqlDependency,
  diff: Differential<T>,
  table: TableDefinition<U>,
  map: (value: T) => Partial<U>,
  options: PerformDiffOptions = {},
): Promise<Unwraped<U>> {
  const lookup = new Map<string, number>();
  let records: U[] = [];

  // Process deletions
  if (options.delete !== false && diff.deletions.length > 0) {
    await table.delete(sql, sql`id IN ${sql(diff.deletions)}`);
  }

  // Process additions by inserting them and adding their ids to the lookup
  if (options.insert !== false && diff.additions.length > 0) {
    records = await table.insert(
      sql,
      diff.additions.map((v) => map(v)),
    );
    for (let i = 0; i < records.length; i++) {
      lookup.set(diff.additions[i].id, records[i].id);
    }
  }

  // Process modifications by updating records and adding their ids to the lookup
  // uses a hard fail if the record doesn't exist to cancel the transaction
  if (options.update !== false) {
    for (const mod of diff.modifications) {
      const record = await table.updateOne(
        sql,
        sql`id = ${mod.target}`,
        map(mod.value),
      );
      if (!record) {
        throw new Error(`missing target=${mod.target} from=${mod.value.id}`);
      }
      records.push(record);
      lookup.set(mod.value.id, record.id);
    }
  }

  return { lookup, records };
}

/** A modified staged record with the record it targets plus the new values */
interface Modification<T> {
  target: number;
  value: T;
}

/** A description of how to merge staged records into a resource table */
interface Differential<T> {
  additions: T[];
  deletions: number[];
  modifications: Modification<T>[];
}

/** A database record that can be diff-ed against */
interface Diffable {
  id: number;
  metadata?: {
    ref?: any;
  };
}

export interface DiffOptions {
  /** This is a bit crude for relationships, but works for now */
  deleteUntracked?: boolean;
}

/**
 * Create a differential plan for a complete set of records for a resource.
 * It works out which records should be added, updated or removed
 * based on how the {@link input} records map to database records
 *
 * @param input the complete set of staged records to diff with
 * @param key the key of the staged records to identify each
 * @param current the existing records to diff against
 */
export function _diffResource<T, K extends keyof T, U extends Diffable>(
  input: T[],
  key: K,
  current: U[],
  { deleteUntracked: deleteUnknown = false }: DiffOptions = {},
): Differential<T> {
  const lookup = new Map(input.map((r) => [r[key], r]));

  const deletions: number[] = [];
  const modifications: Modification<T>[] = [];

  // A list of records that were visited during the initial check
  // used later to decide which records need to be inserted
  const visited = new Set<any>();

  for (const record of current) {
    // Skip or delete the record if it has no metadata "ref"
    if (!record.metadata?.ref) {
      if (deleteUnknown) deletions.push(record.id);
      continue;
    }

    // Find if the existing record has a related input record
    const matched = lookup.get(record.metadata.ref);

    // If there is a match, mark the existing record for modification
    // if not, mark it for deletion
    if (matched) {
      modifications.push({ target: record.id, value: matched });
      visited.add(matched[key]);
    } else {
      deletions.push(record.id);
    }
  }

  // Mark any records that we not visited as additions
  const additions = input.filter((r) => !visited.has(r[key]));

  return { additions, modifications, deletions };
}

export function _diffRelationship<
  T,
  U extends Diffable,
  K extends Extract<keyof T, keyof U>,
>(
  input: T[],
  current: U[],
  keys: K[],
  relations: Diffable[][],
): Differential<T> {
  // Create a lookup of existing relations that are set, based on the composite key
  const lookup = new Map(
    current.map((r) => [keys.map((k) => r[k]).join(":"), r]),
  );

  // Start creating the differential
  const additions: T[] = [];
  const modifications: Modification<T>[] = [];

  // Keep a record of which records to keep
  const toKeep = new Set<number>();

  for (const record of input) {
    // Generate the composite key for this input record by mapping
    // input-references to database identifier using the correlating "relations",
    // falling back to the input-ref if the related record doesn't exist yet.
    const key = keys
      .map(
        (k, i) =>
          relations[i].find((r) => r.metadata?.ref === record[k])?.id ??
          record[k],
      )
      .join(":");

    // See if a relation already exists for that composite key
    const alreadyExists = lookup.get(key);

    if (alreadyExists) {
      toKeep.add(alreadyExists.id);
      continue;
    }

    // If the relation doesn't exist, mark it for creation
    additions.push(record);
  }

  // Mark any existing records that were not visited above as to-be-deleted
  const deletions = current.filter((r) => !toKeep.has(r.id)).map((r) => r.id);

  return { additions, deletions, modifications };
}

/** Aggregate several diffs into a human-readable format */
export function _sumDiffs(values: Differential<any>[]) {
  const initial = { additions: 0, modifications: 0, deletions: 0 };
  return values.reduce(
    (sum, value) => ({
      additions: sum.additions + value.additions.length,
      modifications: sum.modifications + value.modifications.length,
      deletions: sum.deletions + value.deletions.length,
    }),
    initial,
  );
}

export function _totalDiffs(diff: Record<string, Differential<any>>) {
  return {
    ...Object.fromEntries(
      Object.entries(diff).map(([k, v]) => [k, _sumDiffs([v])]),
    ),
    total: _sumDiffs(Object.values(diff)),
  };
}
