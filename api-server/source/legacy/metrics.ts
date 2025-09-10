import cookie from "cookie";
import {
  _getRequestCookie,
  assertRequestBody,
  defineRoute,
  HTTPError,
  loader,
  SqlDependency,
  Structure,
  useRandom,
} from "gruber";
import { useAppConfig, useDatabase } from "../lib/globals.ts";
import { LogTable } from "../lib/tables.ts";
import { assertRequestParam, undefinedStructure } from "../lib/gruber-hacks.ts";

interface MetricInit {
  visitor: string;
  name: string;
  payload: any;
}

export class MetricsRepo {
  static use = loader(() => new this(useDatabase()));

  sql: SqlDependency;
  constructor(sql: SqlDependency) {
    this.sql = sql;
  }

  with(sql: SqlDependency) {
    return new MetricsRepo(sql);
  }

  async log(init: MetricInit) {
    await LogTable.insertOne(this.sql, {
      name: init.name,
      visitor: init.visitor,
      payload: init.payload,
    });
  }
}

// https://github.com/digitalinteraction/deconf-api-toolkit/blob/main/src/metrics/metrics-structs.ts

const MetricBody = Structure.union([
  Structure.object({
    name: Structure.literal("login/start"),
    payload: Structure.object({ emailHash: Structure.string() }),
  }),
  Structure.object({
    name: Structure.literal("login/logout"),
    payload: Structure.object({}),
  }),
  Structure.object({
    name: Structure.literal("login/finish"),
    payload: Structure.object({}),
  }),
  Structure.object({
    name: Structure.literal("login/unregister"),
    payload: Structure.object({ confirmed: Structure.boolean() }),
  }),

  Structure.object({
    name: Structure.literal("session/ical"),
    payload: Structure.object({ sessionId: Structure.string() }),
  }),

  Structure.object({
    name: Structure.literal("attendance/attend"),
    payload: Structure.object({ sessionId: Structure.string() }),
  }),
  Structure.object({
    name: Structure.literal("attendance/unattend"),
    payload: Structure.object({ sessionId: Structure.string() }),
  }),
  Structure.object({
    name: Structure.literal("session/link"),
    payload: Structure.object({
      sessionId: Structure.string(),
      action: Structure.string(),
      link: Structure.string(),
    }),
  }),

  Structure.object({
    name: Structure.literal("general/pageView"),
    payload: Structure.object({
      routeName: Structure.string(),
      params: Structure.any(),
    }),
  }),

  //
  // Moz custom
  //
  Structure.object({
    name: Structure.literal("session/ical"),
    payload: Structure.object({ sessionId: Structure.string() }),
  }),
  Structure.object({
    name: Structure.literal("atrium/widget"),
    payload: Structure.object({ widget: Structure.string() }),
  }),
  Structure.object({
    name: Structure.literal("session/recommendation"),
    payload: Structure.object({
      fromSession: Structure.string(),
      toSession: Structure.string(),
      index: Structure.number(),
    }),
  }),
  Structure.object({
    name: Structure.literal("session/share"),
    payload: Structure.object({
      sessionId: Structure.string(),
      kind: Structure.string(),
    }),
  }),
  Structure.object({
    name: Structure.literal("profile/userCalendar"),
    payload: Structure.object({}),
  }),
]);

const MAX_BODY_SIZE = 10 * 1024;

/** Get a JSON payload if it is less than 10kB */
async function getLimitedJson(request: Request) {
  if (!request.body) throw HTTPError.badRequest();

  let bytes = 0;

  // Pipe the stream through a custom transform
  // which will throw an error if too much data is sent through it
  // also pipe the available bytes through a text decoder to convert to strings
  const stream = request.body
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          bytes += chunk.byteLength;
          if (bytes > MAX_BODY_SIZE) controller.error();
          else controller.enqueue(chunk);
        },
      }),
    )
    .pipeThrough(new TextDecoderStream("utf-8"));

  try {
    // Proces the stream into string chunks
    let chunks: string[] = [];
    for await (const chunk of stream) chunks.push(chunk);

    // Finally parse those strings into JSON
    return JSON.parse(chunks.join(""));
  } catch {
    throw HTTPError.badRequest("invalid json");
  }
}

export const metricRoute = defineRoute({
  method: "POST",
  pathname: "/legacy/:conference/metrics",
  dependencies: {
    random: useRandom,
    repo: MetricsRepo.use,
    appConfig: useAppConfig,
  },
  async handler({ request, random, repo, params, appConfig, url }) {
    if (!appConfig.legacy.metrics) throw HTTPError.notImplemented();

    const body = assertRequestBody(MetricBody, await getLimitedJson(request));

    // Get the visitor ID from their cookies, search parameters or generate one
    const visitor =
      _getRequestCookie(request, "visitor_id") ??
      url.searchParams.get("visitor_id") ??
      random.uuid();

    // Log the metric against the conference
    await repo.log({
      name: body.name,
      payload: {
        ...(body.payload ?? {}),
        conference_id: assertRequestParam(params.conference),
      },
      visitor,
    });

    // Set the cookie back onto the client for another 30 minutes
    const headers = new Headers();
    headers.set(
      "Set-Cookie",
      cookie.serialize("visitor_id", visitor, {
        httpOnly: true,
        maxAge: 30 * 60,
        secure: appConfig.server.url.protocol === "https:",
      }),
    );

    // Return their visitor ID
    return Response.json({ visitor }, { headers });
  },
});
