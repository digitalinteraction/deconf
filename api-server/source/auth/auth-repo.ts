import { loader, SqlDependency } from "gruber";

import {
  assertRequestParam,
  ConferenceTable,
  Oauth2TokenRecord,
  OAuth2TokenTable,
  RegistrationTable,
  useDatabase,
  UserTable,
} from "../lib/mod.ts";

export class AuthRepo {
  static use = loader(() => new AuthRepo(useDatabase()));

  sql: SqlDependency;
  constructor(sql: SqlDependency) {
    this.sql = sql;
  }

  with(sql: SqlDependency) {
    return new AuthRepo(sql);
  }

  getUser(userId: number) {
    return UserTable.selectOne(this.sql, this.sql`id = ${userId}`);
  }

  getUserByEmail(email: string) {
    return UserTable.selectOne(this.sql, this.sql`email = ${email}`);
  }

  listRegistrations(userId: number) {
    return RegistrationTable.select(this.sql, this.sql`user_id = ${userId}`);
  }

  getConference(id: string | number) {
    return ConferenceTable.selectOne(
      this.sql,
      this.sql`id = ${assertRequestParam(id)}`,
    );
  }

  createToken(init: Omit<Oauth2TokenRecord, "id" | "created_at">) {
    return OAuth2TokenTable.insertOne(this.sql, init);
  }
}
