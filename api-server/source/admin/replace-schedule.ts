import {
  assertRequestBody,
  defineRoute,
  Infer,
  SqlDependency,
  Structure,
} from "gruber";
import { useAuthz, useDatabase } from "../lib/globals.ts";
import { pickProperties, TableDefinition } from "../lib/gruber-hacks.ts";
import {
  LabelTable,
  PersonTable,
  SessionLabelTable,
  SessionLinkTable,
  SessionPersonTable,
  SessionTable,
  TaxonomyTable,
} from "../lib/tables.ts";
import {
  LabelRecord,
  PersonRecord,
  SessionLabelRecord,
  SessionLinkRecord,
  SessionPersonRecord,
  SessionRecord,
  TaxonomyRecord,
} from "../lib/types.ts";
import { _getConferenceData } from "./get-conference.ts";

// The shape of the accepted HTTP request body
const _Request = Structure.object({
  taxonomies: Structure.array(
    Structure.object({
      id: Structure.string(),
      ...TaxonomyTable.fields(["icon", "title", "metadata"]),
    }),
  ),
  labels: Structure.array(
    Structure.object({
      id: Structure.string(),
      taxonomy_id: Structure.string(),
      ...LabelTable.fields(["icon", "title", "metadata"]),
    }),
  ),
  people: Structure.array(
    Structure.object({
      id: Structure.string(),
      ...PersonTable.fields([
        "avatar_id",
        "bio",
        "name",
        "subtitle",
        "metadata",
      ]),
    }),
  ),
  sessions: Structure.array(
    Structure.object({
      id: Structure.string(),
      ...SessionTable.fields([
        "title",
        "slug",
        "summary",
        "details",
        "languages",
        "visibility",
        "state",
        "start_date",
        "end_date",
        "metadata",
      ]),
    }),
  ),
  sessionPeople: Structure.array(
    Structure.object({
      id: Structure.string(),
      session_id: Structure.string(),
      person_id: Structure.string(),
    }),
  ),
  sessionLabels: Structure.array(
    Structure.object({
      id: Structure.string(),
      session_id: Structure.string(),
      label_id: Structure.string(),
    }),
  ),
  sessionLinks: Structure.array(
    Structure.object({
      id: Structure.string(),
      session_id: Structure.string(),
      ...SessionLinkTable.fields(["title", "url", "metadata"]),
    }),
  ),
});

export const replaceScheduleRoute = defineRoute({
  method: "PUT",
  pathname: "/admin/v1/conferences/:conference/schedule",
  dependencies: {
    authz: useAuthz,
    sql: useDatabase,
  },
  async handler({ request, authz, url, sql, params }) {
    await authz.assert(request, { scope: "admin" });

    // Fetch information to start the diff
    const dryRun = url.searchParams.get("dryRun");
    const body = await assertRequestBody(_Request, request);
    const data = await _getConferenceData(sql, params.conference);

    // Work out the difference for each resource type
    const diff = {
      taxonomies: _diffResource(body.taxonomies, "id", data.taxonomies),
      people: _diffResource(body.people, "id", data.people),
      sessions: _diffResource(body.sessions, "id", data.sessions),

      labels: _diffResource(body.labels, "id", data.labels),
      sessionPeople: _diffResource(
        body.sessionPeople,
        "id",
        data.sessionPeople,
        { deleteUntracked: true },
      ),
      sessionLinks: _diffResource(body.sessionLinks, "id", data.sessionLinks),
      sessionLabels: _diffResource(
        body.sessionLabels,
        "id",
        data.sessionLabels,
        { deleteUntracked: true },
      ),
    };

    // Exit early & output information if the dry run flag was passed in the URL
    if (dryRun === "verbose") {
      return Response.json(diff);
    }
    if (dryRun) {
      return Response.json({
        ...Object.fromEntries(
          Object.entries(diff).map(([k, v]) => [k, _sumDiffs([v])]),
        ),
        total: _sumDiffs(Object.values(diff)),
      });
    }

    // Run the replacement in a migration, so if any of it fails the state is reset
    // Go through each resource and perform the diff using "unwrap"
    // each unwrap performs additions/modifications/deletions against the table
    // with the custom map method to customise how fields are inserted
    await sql.begin(async (trx) => {
      const taxonomies = await _unwrap(
        trx,
        diff.taxonomies,
        TaxonomyTable,
        (value): Partial<TaxonomyRecord> => ({
          ...pickProperties(value, ["title", "icon", "metadata"]),
          conference_id: data.conference.id,
        }),
      );
      const labels = await _unwrap(
        trx,
        diff.labels,
        LabelTable,
        (value): Partial<LabelRecord> => ({
          ...pickProperties(value, ["title", "icon", "metadata"]),
          taxonomy_id: getRelated(taxonomies.lookup, value.taxonomy_id),
        }),
      );

      const sessions = await _unwrap(
        trx,
        diff.sessions,
        SessionTable,
        (value): Partial<SessionRecord> => ({
          ...pickProperties(value, [
            "title",
            "slug",
            "summary",
            "details",
            "languages",
            "visibility",
            "state",
            "start_date",
            "end_date",
            "metadata",
          ]),
          conference_id: data.conference.id,
        }),
      );

      const people = await _unwrap(
        trx,
        diff.people,
        PersonTable,
        (value): Partial<PersonRecord> => ({
          ...pickProperties(value, [
            "avatar_id",
            "bio",
            "name",
            "subtitle",
            "metadata",
          ]),
          conference_id: data.conference.id,
        }),
      );

      const sessionPeople = await _unwrap(
        trx,
        diff.sessionPeople,
        SessionPersonTable,
        (value): Partial<SessionPersonRecord> => ({
          person_id: getRelated(people.lookup, value.person_id),
          session_id: getRelated(sessions.lookup, value.session_id),
        }),
      );

      const sessionLabels = await _unwrap(
        trx,
        diff.sessionLabels,
        SessionLabelTable,
        (value): Partial<SessionLabelRecord> => ({
          label_id: getRelated(labels.lookup, value.label_id),
          session_id: getRelated(sessions.lookup, value.session_id),
        }),
      );

      // TODO: I'm not sure how this diff will work,
      // links won't have IDs to diff against like other records
      //
      // const sessionLinks = await unwrap(
      //   trx,
      //   diff.sessionLinks,
      //   SessionLinkTable,
      //   (value): Partial<SessionLinkRecord> => ({
      //     session_id: getRelated(sessions.lookup, value.session_id)
      //   })
      // )

      const sessionLinks = await _unwrap(
        trx,
        diff.sessionLinks,
        SessionLinkTable,
        (value): Partial<SessionLinkRecord> => ({
          session_id: getRelated(sessions.lookup, value.session_id),
          title: value.title,
          url: value.url,
          metadata: value.metadata,
        }),
      );
    });

    // Output a summary of the changes
    return Response.json(_sumDiffs(Object.values(diff)));
  },
});

/** Get a related value from a map with a hard throw if it is missing */
function getRelated<K, V>(map: Map<K, V>, key: K) {
  const value = map.get(key);
  if (!value) throw new Error("missing related value: " + key);
  return value;
}

/** An unwrapped diff, the records created and a map of temporary to real ids */
interface Unwraped<T> {
  lookup: Map<string, number>;
  records: T[];
}

/**
 * Perform a diff against a {@link TableDefinition}
 * with a custom map method to decide how columns are arranged
 *
 * NOTE: I'd rather not depend on TableDefinition
 * NOTE: I also can't get it to type map's param properly
 */
export async function _unwrap<
  T extends { id: string },
  U extends { id: number },
>(
  sql: SqlDependency,
  diff: Differential<T>,
  table: TableDefinition<U>,
  map: (value: T) => Partial<U>,
): Promise<Unwraped<U>> {
  const lookup = new Map<string, number>();
  let records: U[] = [];

  // Process deletions
  if (diff.deletions.length > 0) {
    await table.delete(sql, sql`id IN ${sql(diff.deletions)}`);
  }

  // Process additions by inserting them and adding their ids to the lookup
  if (diff.additions.length > 0) {
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

interface DiffOptions {
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
  const visited = new Set();

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

//
// NOTES:
// - I think the diff should require the id/metadata#ref relation and set it itself
//
