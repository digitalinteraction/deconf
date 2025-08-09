import {
  assertRequestBody,
  defineRoute,
  HTTPError,
  SqlDependency,
  Structure,
} from "gruber";
import { useAuthz, useDatabase } from "../lib/globals.ts";
import {
  ConferenceTable,
  RegistrationTable,
  UserTable,
} from "../lib/tables.ts";
import { assertRequestParam, pickProperties } from "../lib/gruber-hacks.ts";
import {
  _diffResource,
  _getRelated,
  _totalDiffs,
  _unwrap,
} from "./upsert-schedule.ts";
import { RegistrationRecord, UserRecord } from "../lib/mod.ts";

export const _Request = Structure.object({
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

export const upsertRegistrationsRoute = defineRoute({
  method: "PUT",
  pathname: "/admin/v1/conferences/:conference/registrations",
  dependencies: {
    authz: useAuthz,
    sql: useDatabase,
  },
  async handler({ request, authz, url, sql, params }) {
    await authz.assert(request, { scope: "admin" });

    const dryRun = url.searchParams.get("dryRun");
    const body = await assertRequestBody(_Request, request);

    const { conference, registrations, users } = await _assertRegistrationData(
      sql,
      params.conference,
    );

    // Work out the difference for each resource type
    const diff = {
      users: _diffResource(body.users, "id", users),
      registrations: _diffResource(body.registrations, "id", registrations),
    };

    // Exit early & output information if the dry run flag was passed in the URL
    if (dryRun === "verbose") {
      return Response.json(diff);
    }
    if (dryRun) {
      return Response.json(_totalDiffs(diff));
    }

    await sql.begin(async (trx) => {
      // Process user records and get a map of virtual ids to real ones
      const users = await _unwrap(
        trx,
        diff.users,
        UserTable,
        (value): Partial<UserRecord> => ({
          email: value.email,
          consented_at: value.consented_at,
          metadata: value.metadata,
        }),
        { delete: false },
      );

      // Process registration records
      await _unwrap(
        trx,
        diff.registrations,
        RegistrationTable,
        (value): Partial<RegistrationRecord> => ({
          conference_id: conference.id,
          name: value.name,
          role: value.role,
          user_id: _getRelated(users.lookup, value.user_id),
          metadata: value.metadata,
        }),
        { delete: false },
      );
    });

    return Response.json(_totalDiffs(diff));
  },
});
