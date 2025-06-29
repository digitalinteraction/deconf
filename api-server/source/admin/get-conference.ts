import { defineRoute, HTTPError, SqlDependency } from "gruber";
import { useAuthz, useDatabase } from "../lib/globals.ts";
import {
  ConferenceTable,
  ContentTable,
  LabelTable,
  PersonTable,
  SessionLabelTable,
  SessionLinkTable,
  SessionPersonTable,
  SessionTable,
  TaxonomyTable,
} from "../lib/tables.ts";
import { assertRequestParam } from "../lib/gruber-hacks.ts";

// Map an array of records to their raw ids, for use in an SQL query
function getRecordIds(input: { id: number }[]) {
  return input.map((r) => r.id);
}

export type _ConferenceData = ReturnType<typeof _getConferenceData>;

export async function _getConferenceData(
  sql: SqlDependency,
  confId: string | number,
) {
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

  return {
    conference,
    sessions,
    people,
    content,

    taxonomies,
    labels,

    sessionLinks,
    sessionPeople,
    sessionLabels,
  };
}

export const getConferenceRoute = defineRoute({
  method: "GET",
  pathname: "/admin/v1/conference/:conference/schedule",
  dependencies: {
    authz: useAuthz,
    sql: useDatabase,
  },
  async handler({ request, authz, sql, params }) {
    await authz.assert(request, { scope: "admin" });

    return Response.json(await _getConferenceData(sql, params.conference));
  },
});
