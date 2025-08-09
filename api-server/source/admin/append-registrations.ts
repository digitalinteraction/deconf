// ...

import { assertRequestBody, defineRoute, useRandom } from "gruber";
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
import { _assertRegistrationData, _Request } from "./upsert-registrations.ts";
import {
  _diffResource,
  _getRelated,
  _totalDiffs,
  _unwrap,
} from "./upsert-schedule.ts";
import { use } from "marked";
import { _startEmailLogin } from "../auth/login.ts";

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

    // Perform only the additions
    const result = await sql.begin(async (trx) => {
      const users = await _unwrap(
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

      // Process registration records
      const registrations = await _unwrap(
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

      return { users, registrations };
    });

    // Send login emails to new users
    for (const reg of result.registrations.records) {
      const user = result.users.records.find((u) => u.id === reg.user_id)!;

      const login = {
        token: random.uuid(),
        code: random.number(0, 999_999),
        redirectUri: "https://example.com", // TODO: this needs to be set properly
        uses: 5,
      };

      await _startEmailLogin(
        store,
        email,
        login,
        user.email,
        reg.conference_id,
        appConfig.auth.loginMaxAge,
      );
    }

    return Response.json(_totalDiffs(diff));
  },
});
