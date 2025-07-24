import { assertRequestBody, defineRoute, HTTPError, Structure } from "gruber";
import {
  assertRequestParam,
  localisedStructure,
  recordStructure,
} from "../lib/gruber-hacks.ts";
import { useAuthz, useDatabase, useStore } from "../lib/globals.ts";
import { ConferenceTable, ContentTable } from "../lib/tables.ts";
import { _diffResource, _sumDiffs, _unwrap } from "./upsert-schedule.ts";
import { ContentRecord } from "../lib/types.ts";

const _Request = Structure.array(
  Structure.object({
    id: Structure.string(),
    slug: Structure.string(),
    content_type: Structure.string(),
    body: localisedStructure(),
    metadata: Structure.any(),
  }),
);

export const upsertContentRoute = defineRoute({
  method: "PUT",
  pathname: "/admin/v1/conferences/:conference/content",
  dependencies: {
    authz: useAuthz,
    sql: useDatabase,
    store: useStore,
  },
  async handler({ request, authz, url, sql, params, store }) {
    await authz.assert(request, { scope: "admin" });

    // grep the request
    const dryRun = url.searchParams.get("dryRun");
    const body = await assertRequestBody(_Request, request);

    // Check the conference exists first
    const conference = await ConferenceTable.selectOne(
      sql,
      sql`id = ${assertRequestParam(params.conference)}`,
    );
    if (!conference) throw HTTPError.notFound();

    // Find existing content records
    const records = await ContentTable.select(
      sql,
      sql`conference_id = ${conference.id}`,
    );

    // Work out what to change
    const diff = _diffResource(body, "id", records, { deleteUntracked: true });

    // Dump & exit early dor dry-runs
    if (dryRun) {
      return Response.json(diff);
    }

    // Perform the diff
    await sql.begin(async (trx) => {
      await _unwrap(
        trx,
        diff,
        ContentTable,
        (value): Partial<ContentRecord> => ({
          body: value.body,
          conference_id: conference.id,
          content_type: value.content_type,
          slug: value.slug,
          metadata: value.metadata,
        }),
      );
    });

    await store.delete(`/legacy/${conference.id}/schedule`);

    // Return a summary of actions
    return Response.json(_sumDiffs([diff]));
  },
});
