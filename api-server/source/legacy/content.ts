import * as deconf from "@openlab/deconf-shared";
import { defineRoute, HTTPError, loader, SqlDependency } from "gruber";
import { marked } from "marked";
import { ContentTable, useDatabase, useStore } from "../lib/mod.js";
import { cache, LegacyApiError, LegacyRepo } from "./lib.js";

class ContentRepo {
  static use = loader(() => new this(useDatabase()));

  sql: SqlDependency;
  constructor(sql: SqlDependency) {
    this.sql = sql;
  }

  with(sql: SqlDependency) {
    return new ContentRepo(sql);
  }

  getContent(slug: string, conferenceId: number) {
    return ContentTable.selectOne(
      this.sql,
      this.sql`slug = ${slug} AND conference_id = ${conferenceId}`,
    );
  }
}

// NOTE: I think the widgets in markdown should just be custom HTML elements that the client can register and pick up
// ~ pre-rendering would be good though

function processMarkdown(
  input: Record<string, string | undefined>,
): deconf.LocalisedContent {
  const output: deconf.LocalisedContent = {
    content: {},
  };

  for (const [key, value] of Object.entries(input)) {
    output.content[key] = marked(value as string, { async: false });
  }

  return output;
}

// Content - get
export const getContentRoute = defineRoute({
  method: "GET",
  pathname: "/legacy/:conference/content/:key",
  dependencies: {
    store: useStore,
    legacy: LegacyRepo.use,
    content: ContentRepo.use,
  },
  async handler({ params, legacy, content, store }) {
    return LegacyApiError.wrap(async () => {
      const conference = await legacy.assertConference(params.conference);

      const record = await cache<deconf.LocalisedContent>(
        store,
        `/legacy/${conference.id}/content/${params.key}`,
        15 * 60 * 1_000,
        async () => {
          const record = await content.getContent(params.key, conference.id);
          return record ? processMarkdown(record.body) : undefined;
        },
      );
      if (!record) throw HTTPError.notFound();

      return Response.json(record);
    });
  },
});
