import { assertRequestBody, defineRoute, HTTPError, useRandom } from "gruber";

import { _startEmailLogin } from "../auth/login.ts";
import {
  RegistrationRecord,
  RegistrationTable,
  useAppConfig,
  useAuthz,
  useDatabase,
  useEmail,
  UserRecord,
  UserTable,
  useStore,
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

export const appendRegistrationsRoute = defineRoute({
  method: "POST",
  pathname: "/admin/v1/conferences/:conference/registrations",
  dependencies: {
    appConfig: useAppConfig,
    store: useStore,
    email: useEmail,
    authz: useAuthz,
    sql: useDatabase,
    random: useRandom,
  },
  async handler({
    request,
    authz,
    url,
    sql,
    params,
    appConfig,
    store,
    email,
    random,
  }) {
    await authz.assert(request, { scope: "admin" });

    const dryRun = url.searchParams.has("dryRun");
    const body = await assertRequestBody(_Request, request);

    // NOTE: this is a bit inefficient if only inserting a couple of records
    // and not performing any diffs
    const { conference, registrations, users } = await _assertRegistrationData(
      sql,
      params.conference,
    );

    const [redirectUri] = conference.metadata.redirect_uris ?? [];
    if (typeof redirectUri !== "string") {
      throw HTTPError.internalServerError(
        "conference#redirect_uris is misconfigured",
      );
    }

    // Work out the difference for each resource type
    const diff = {
      users: _diffResource(body.users, "id", users),
      registrations: _diffResource(body.registrations, "id", registrations),
    };

    // Exit early & output information if the dry run flag was passed in the URL
    if (dryRun) {
      return Response.json({
        users: diff.users.additions,
        registrations: diff.registrations.additions,
      });
    }

    // NOTE: look into enabling update=true in the future
    // NOTE: this code is heavily duplicated with ./upsert-registrations.ts

    // Perform only the additions
    const result = await sql.begin(async (trx) => {
      // First create any user records from the append
      const users = await _performDiff(
        trx,
        diff.users,
        UserTable,
        (value): Partial<UserRecord> => ({
          email: value.email,
          consented_at: value.consented_at,
          metadata: value.metadata,
        }),
        { delete: false, update: false },
      );

      // Second create registration records that are linked to the user
      const registrations = await _performDiff(
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
        { delete: false, update: false },
      );

      // Return all records and lookups if the transaction completes successfully
      return { users, registrations };
    });

    // Send login emails to new users
    for (const user of result.users.records) {
      const login = {
        token: random.uuid(),
        code: random.number(0, 999_999),
        redirectUri,
        uses: 5,
      };

      await _startEmailLogin(
        store,
        email,
        login,
        user.email,
        appConfig.auth.loginMaxAge,
      );
    }

    return Response.json(_totalDiffs(diff));
  },
});
