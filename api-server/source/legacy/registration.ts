import * as deconf from "@openlab/deconf-shared";
import { defineRoute, HTTPError, loader, SqlDependency } from "gruber";
import { LegacyApiError } from "./lib.ts";
import { useAuthz, useDatabase } from "../lib/globals.ts";
import { RegistrationTable, UserTable } from "../lib/tables.ts";
import { assertRequestParam } from "../lib/gruber-hacks.ts";
import { RegistrationRecord, UserRecord } from "../lib/types.ts";

// Registration - startEmailLogin ?
// Registration - endEmailLogin   ?
// Registration - startRegister   ?
// Registration - endRegister     ?
// Registration - unregister      ?

export class RegistrationRepo {
  static use = loader(() => new this(useDatabase()));

  sql: SqlDependency;
  constructor(sql: SqlDependency) {
    this.sql = sql;
  }

  async assertRegistration(userId: number, conferenceId: string | number) {
    const user = await UserTable.selectOne(this.sql, this.sql`id = ${userId}`);
    if (!user) throw HTTPError.unauthorized();

    const registration = await RegistrationTable.selectOne(
      this.sql,
      this.sql`
        conference_id = ${assertRequestParam(conferenceId)}
        AND user_id = ${user.id}
      `,
    );
    if (!registration) throw HTTPError.unauthorized();
    return { user, registration };
  }
}

function convert(
  user: UserRecord,
  registration: RegistrationRecord,
): deconf.Registration {
  return {
    id: user.id,
    created: registration.created_at,
    name: registration.name,
    email: user.email,
    language: registration.metadata.language ?? "en",
    country: "",
    affiliation: "",
    verified: true,
    consented: user.consented_at,
    userData: {},
  };
}

// Registration - getRegistration
export const getRegistrationRoute = defineRoute({
  method: "GET",
  pathname: "/legacy/:conference/auth/me",
  dependencies: {
    authz: useAuthz,
    sql: useDatabase,
    repo: RegistrationRepo.use,
  },
  async handler({ params, request, authz, repo }) {
    return LegacyApiError.wrap(async () => {
      const { userId } = await authz.assertUser(request);

      const { user, registration } = await repo.assertRegistration(
        userId,
        params.conference,
      );

      // TODO: assert if blocked

      // TODO: oauth2 tokens

      return Response.json({
        registration: convert(user, registration),
        tokens: [],
      });
    });
  },
});
