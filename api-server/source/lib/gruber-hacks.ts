import {
  Configuration,
  HTTPError,
  SqlDependency,
  StructuralError,
  Structure,
} from "gruber";

function _pick<T, K extends keyof T>(input: T, keys: K[]): { [L in K]: T[L] } {
  let output: Pick<T, K> = {} as any;
  for (const key of keys) output[key] = input[key];
  return output;
}

// TODO: Maybe a gruber thing? + also in make-place
export type InferTable<T> = T extends TableDefinition<infer U> ? U : never;

export interface TableOptions<T> {
  table: string;
  fields: { [K in keyof T]: Structure<T[K]> };
}

export interface TableDefinition<T> {
  select(sql: SqlDependency, where: any): Promise<T[]>;
  select<K extends keyof T = keyof T>(
    sql: SqlDependency,
    where: any,
    columns?: K[],
  ): Promise<Pick<T, K>[]>;

  selectOne(sql: SqlDependency, where: any): Promise<T | null>;
  selectOne<K extends keyof T = keyof T>(
    sql: SqlDependency,
    where: any,
    columns?: K[],
  ): Promise<Pick<T, K> | null>;

  updateOne(
    sql: SqlDependency,
    where: any,
    patch: Partial<T>,
  ): Promise<T | null>;
  updateOne<K extends keyof T = keyof T>(
    sql: SqlDependency,
    where: any,
    patch: Partial<T>,
    columns?: K[],
  ): Promise<Pick<T, K> | null>;

  insertOne(sql: SqlDependency, values: Partial<T>): Promise<T | null>;
  insertOne<K extends keyof T = keyof T>(
    sql: SqlDependency,
    values: Partial<T>,
    columns?: K[],
  ): Promise<Pick<T, K> | null>;

  delete(sql: SqlDependency, where: any): Promise<void>;

  structure<K extends keyof T>(keys: K[]): Structure<Pick<T, K>>;

  partial<K extends keyof T>(keys: K[]): Structure<Partial<Pick<T, K>>>;

  tableName: string;
  columns: (keyof T)[];
}

export function defineTable<T>({
  table,
  fields,
}: TableOptions<T>): TableDefinition<T> {
  const allColumns = Object.keys(fields) as (keyof T)[];
  return {
    select<K extends keyof T = keyof T>(
      sql: SqlDependency,
      where: any,
      columns?: K[],
    ): Promise<Pick<T, K>[]> {
      return sql<Pick<T, K>[]>`
        SELECT ${sql(columns ?? allColumns)}
        FROM ${sql(table)}
        WHERE ${where}
      `;
    },

    async selectOne<K extends keyof T = keyof T>(
      sql: SqlDependency,
      where: any,
      columns?: K[],
    ): Promise<Pick<T, K> | null> {
      const [value = null] = await this.select(sql, where, columns);
      return value;
    },

    async updateOne<K extends keyof T = keyof T>(
      sql: SqlDependency,
      where: any,
      patch: Partial<T>,
      columns?: K[],
    ): Promise<Pick<T, K> | null> {
      const [record = null] = await sql`
        UPDATE ${table}
        SET ${sql(patch)}
        WHERE ${where}
        RETURNING ${sql(columns ?? allColumns)}
      `;
      return record;
    },

    async insertOne<K extends keyof T = keyof T>(
      sql: SqlDependency,
      values: Partial<T>,
      columns?: K[],
    ): Promise<Pick<T, K>> {
      const [record = null] = await sql`
        INSERT INTO ${table}
        VALUES ${sql(values)}
        RETURNING ${sql(columns)}
      `;
      if (!record) throw new Error(`Insert into ${table} failed`);
      return record;
    },

    async delete(sql: SqlDependency, where: any) {
      await sql`
        DELETE FROM ${table}
        WHERE ${where}
      `;
    },

    structure<K extends keyof T>(keys: K[]) {
      return Structure.object(_pick(fields, keys));
    },

    partial<K extends keyof T>(keys: K[]): Structure<Pick<Partial<T>, K>> {
      return Structure.partial(_pick(fields, keys));
    },

    get tableName() {
      return table;
    },

    get columns() {
      return allColumns;
    },
  };
}

export function recordStructure<T extends string | number | symbol, U>(
  keyStruct: Structure<T>,
  valueStruct: Structure<U>,
) {
  return new Structure<Record<T, U | undefined>>(
    { type: "object" },
    (value, context) => {
      if (typeof value !== "object") throw new Error("not an object");

      const output: any = {};
      const errors: any[] = [];
      for (const key in Object.entries(value as any)) {
        try {
          output[keyStruct.process(key)] = valueStruct.process(value);
        } catch (error) {
          errors.push(error as Error);
        }
      }
      if (errors.length > 0) {
        throw new StructuralError("invalid record", context.path, errors);
      }
      for (const key in output) {
        if (output[key] === undefined) delete output[key];
      }

      return output;
    },
  );
}

export function getOrInsert<K, V>(map: Map<K, V>, key: K, defaultValue: V) {
  if (!map.has(key)) {
    map.set(key, defaultValue);
  }
  return map.get(key)!;
}

export interface ConfigFileOptions {
  variable?: string;
  fallback?: string;
}

export interface ConfiguredFile {
  bytes: Uint8Array;
}

export function configFile(
  config: Configuration,
  path: string | URL,
  options: ConfigFileOptions,
) {
  if (!options.fallback) {
    throw new TypeError("options.fallback must be a string");
  }

  const url = new URL(path);

  if (url.protocol !== "file:") {
    throw new TypeError("path does not use file: protocol");
  }

  const struct = new Structure<ConfiguredFile>(
    { type: "text" },
    (value, context) => {
      if (context.type !== "async") {
        throw new Error("config.file must be used async");
      }

      const result = {} as ConfiguredFile;

      context.promises.push(async () => {
        const file = await config.options.readFile(url);
        if (file) {
          result.bytes = file;
        } else if (value !== undefined) {
          if (typeof value !== "string") {
            throw new Error("not a string");
          }
          result.bytes = new TextEncoder().encode(value);
        } else {
          result.bytes = new TextEncoder().encode(options.fallback);
        }
      });

      return result;
    },
  );

  const relative = url
    .toString()
    .replace(config.options.getWorkingDirectory().toString(), ".");

  Object.defineProperty(struct, Configuration.spec, {
    value: (property: string) => ({
      fallback: options.fallback,
      fields: [
        {
          name: property,
          type: "file",
          variable: options.variable,
          fallback: options.fallback,
          description: `file:${relative}`,
        },
      ],
    }),
  });

  return struct;
}

// // TODO: I'm not sure about this
// export function defineSqlRepo<
//   T extends Record<string, (this: { sql: SqlDependency }) => void>,
// >(fields: T) {
//   const block = (sql = useDatabase()) => {
//     return {
//       ...fields,
//       with: (sql: SqlDependency) => block(sql),
//     };
//   };
//   return block;
// }

export function assertRequestParam(input: any) {
  if (typeof input === "string") input = parseInt(input);
  if (typeof input !== "number" || Number.isNaN(input)) {
    throw HTTPError.badRequest("bad url param");
  }

  return input;
}
