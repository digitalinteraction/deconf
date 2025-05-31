import { loader, SqlDependency } from "gruber";
import { useDatabase } from "../lib/globals.ts";
import { RegistrationTable, UserTable } from "../lib/tables.ts";

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
}
