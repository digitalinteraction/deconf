import { assertRequestBody, defineRoute, Structure } from "gruber";

import {
  AssetRecord,
  AssetTable,
  LabelRecord,
  LabelTable,
  PersonRecord,
  PersonTable,
  pickProperties,
  SessionLabelRecord,
  SessionLabelTable,
  SessionLinkRecord,
  SessionLinkTable,
  SessionPersonRecord,
  SessionPersonTable,
  SessionRecord,
  SessionTable,
  TaxonomyRecord,
  TaxonomyTable,
  useAuthz,
  useDatabase,
  useStore,
} from "../lib/mod.ts";
import {
  _assertConferenceData,
  _diffRelationship,
  _diffResource,
  _getRelated,
  _performDiff,
  _totalDiffs,
} from "./admin-lib.ts";

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
      avatar_id: Structure.union([Structure.null(), Structure.string()]),
      ...PersonTable.fields(["bio", "name", "subtitle", "metadata"]),
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
  assets: Structure.array(
    Structure.object({
      id: Structure.string(),
      ...AssetTable.fields(["title", "url", "metadata"]),
    }),
  ),
});

export const upsertScheduleRoute = defineRoute({
  method: "PUT",
  pathname: "/admin/v1/conferences/:conference/schedule",
  dependencies: {
    authz: useAuthz,
    sql: useDatabase,
    store: useStore,
  },
  async handler({ request, authz, url, sql, params, store }) {
    await authz.assert(request, { scope: "admin" });

    // Fetch information to start the diff
    const dryRun = url.searchParams.get("dryRun");
    const body = await assertRequestBody(_Request, request);
    const data = await _assertConferenceData(sql, params.conference);

    // Work out the difference for each resource type
    const diff = {
      taxonomies: _diffResource(body.taxonomies, "id", data.taxonomies),
      people: _diffResource(body.people, "id", data.people),
      sessions: _diffResource(body.sessions, "id", data.sessions),

      labels: _diffResource(body.labels, "id", data.labels),
      sessionPeople: _diffRelationship(
        body.sessionPeople,
        data.sessionPeople,
        ["session_id", "person_id"],
        [data.sessions, data.people],
      ),

      sessionLinks: _diffResource(body.sessionLinks, "id", data.sessionLinks),
      sessionLabels: _diffRelationship(
        body.sessionLabels,
        data.sessionLabels,
        ["label_id", "session_id"],
        [data.labels, data.sessions],
      ),

      assets: _diffResource(body.assets, "id", data.assets),
    };

    // Exit early & output information if the dry run flag was passed in the URL
    if (dryRun === "verbose") {
      return Response.json(diff);
    }
    if (dryRun) {
      return Response.json(_totalDiffs(diff));
    }

    // Run the replacement in a migration, so if any of it fails the state is reset
    // Go through each resource and perform the diff using "unwrap"
    // each unwrap performs additions/modifications/deletions against the table
    // with the custom map method to customise how fields are inserted
    await sql.begin(async (trx) => {
      const taxonomies = await _performDiff(
        trx,
        diff.taxonomies,
        TaxonomyTable,
        (value): Partial<TaxonomyRecord> => ({
          ...pickProperties(value, ["title", "icon", "metadata"]),
          conference_id: data.conference.id,
        }),
      );
      const labels = await _performDiff(
        trx,
        diff.labels,
        LabelTable,
        (value): Partial<LabelRecord> => ({
          ...pickProperties(value, ["title", "icon", "metadata"]),
          taxonomy_id: _getRelated(taxonomies.lookup, value.taxonomy_id),
        }),
      );

      const sessions = await _performDiff(
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

      const assets = await _performDiff(
        trx,
        diff.assets,
        AssetTable,
        (value): Partial<AssetRecord> => ({
          ...pickProperties(value, ["title", "url", "metadata"]),
          conference_id: data.conference.id,
        }),
        { delete: false },
      );

      const people = await _performDiff(
        trx,
        diff.people,
        PersonTable,
        (value): Partial<PersonRecord> => ({
          ...pickProperties(value, ["bio", "name", "subtitle", "metadata"]),
          conference_id: data.conference.id,
          avatar_id: value.avatar_id
            ? _getRelated(assets.lookup, value.avatar_id)
            : null,
        }),
      );

      const sessionPeople = await _performDiff(
        trx,
        diff.sessionPeople,
        SessionPersonTable,
        (value): Partial<SessionPersonRecord> => ({
          person_id: _getRelated(people.lookup, value.person_id),
          session_id: _getRelated(sessions.lookup, value.session_id),
        }),
      );

      const sessionLabels = await _performDiff(
        trx,
        diff.sessionLabels,
        SessionLabelTable,
        (value): Partial<SessionLabelRecord> => ({
          label_id: _getRelated(labels.lookup, value.label_id),
          session_id: _getRelated(sessions.lookup, value.session_id),
        }),
      );

      const sessionLinks = await _performDiff(
        trx,
        diff.sessionLinks,
        SessionLinkTable,
        (value): Partial<SessionLinkRecord> => ({
          session_id: _getRelated(sessions.lookup, value.session_id),
          title: value.title,
          url: value.url,
          metadata: value.metadata,
        }),
      );
    });

    // Clear the cached schedule in the store
    await store.delete(`/legacy/${data.conference.id}/schedule`);

    // Output a summary of the changes
    return Response.json(_totalDiffs(diff));
  },
});
