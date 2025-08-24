import { assertRequestBody, defineRoute } from "gruber";

import {
  RegistrationRecord,
  RegistrationTable,
  useAuthz,
  useDatabase,
  UserRecord,
  UserTable,
} from "../lib/mod.ts";
import {
  _assertRegistrationData,
  _diffResource,
  _getRelated,
  _performDiff,
  _totalDiffs,
  StagedRegistrations,
} from "./admin-lib.ts";

export const _Request = StagedRegistrations;

export const upsertRegistrationsRoute = defineRoute({
  method: "PUT",
  pathname: "/admin/v1/conferences/:conference/registrations",
  dependencies: {
    authz: useAuthz,
    sql: useDatabase,
  },
  async handler({ request, authz, url, sql, params }) {
    await authz.assert(request, { scope: "admin" });

    // Get information from the request
    const dryRun = url.searchParams.get("dryRun");
    const body = await assertRequestBody(_Request, request);

    // Get information from the database
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

    // NOTE: this heavily duplicates logic with ./append-registrations.ts

    await sql.begin(async (trx) => {
      // First process user records and get a map of virtual ids to real ones
      const users = await _performDiff(
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

      // Then process registration records with those user ids
      await _performDiff(
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
