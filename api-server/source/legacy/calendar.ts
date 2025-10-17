import { defineRoute, HTTPError } from "gruber";
import ics from "ics";
import {
  ConferenceInfo,
  getConferenceInfo,
  getSessionUrl,
  SessionRecord,
  useAppConfig,
  useAuthz,
  useTokens,
} from "../lib/mod.js";
import { LegacyApiError, LegacyRepo } from "./legacy-lib.ts";

function getIcsDate(date: Date) {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ] as [number, number, number, number, number];
}

function getSessionIcsOptions(
  session: SessionRecord,
  info: ConferenceInfo,
): ics.EventAttributes {
  if (!session.start_date || !session.end_date) throw HTTPError.notFound();

  const location: string[] = [];
  if (session.metadata.location) location.push(session.metadata.location);
  if (info.location) location.push(info.location);

  return {
    uid: `ptx_${session.slug}`,
    start: getIcsDate(session.start_date),
    startInputType: "utc",
    end: getIcsDate(session.end_date),
    endInputType: "utc",
    title: session.title.en,
    description: session.summary.en,
    url: getSessionUrl(info.sessionUrl, session.id),
    calName: info.appName,
    location: location.length > 0 ? location.join(", ") : undefined,
    geo: info.geo,
  };
}

function assertIcs(file: ics.ReturnObject) {
  if (!file.value) {
    console.error("ICS error", file.error);
    throw HTTPError.internalServerError("failed to generate session ics");
  }
  return file.value;
}

function getSessionIcs(session: SessionRecord, info: ConferenceInfo) {
  return assertIcs(ics.createEvent(getSessionIcsOptions(session, info)));
}

function getSessionsIcal(sessions: SessionRecord[], info: ConferenceInfo) {
  return assertIcs(
    ics.createEvents(
      sessions
        .filter((s) => s.start_date && s.end_date)
        .map((s) => getSessionIcsOptions(s, info)),
    ),
  );
}

function padStart(input: number, zeros: number) {
  return input.toString().padStart(zeros, "0");
}

function getGoogleDate(input: Date) {
  return [
    input.getUTCFullYear(),
    padStart(input.getUTCMonth() + 1, 2),
    padStart(input.getUTCDate(), 2),
    "T",
    padStart(input.getUTCHours(), 2),
    padStart(input.getUTCMinutes(), 2),
    padStart(input.getUTCSeconds(), 2),
    "Z",
  ].join("");
}

function getSessionGoogleCalUrl(session: SessionRecord) {
  if (!session.start_date || !session.end_date) throw HTTPError.notFound();

  const url = new URL("https://calendar.google.com/event");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set(
    "dates",
    `${getGoogleDate(session.start_date)}/${getGoogleDate(session.end_date)}`,
  );
  url.searchParams.set("text", session.title.en ?? "");

  // TODO: how to calculate the session URL
  // url.searchParams.set(
  //   'location',
  //   this.#context.url.getSessionLink(session.id).toString(),
  // )

  return url;
}

// Calendar - getSessionIcs
export const sessionIcsRoute = defineRoute({
  method: "GET",
  pathname: "/legacy/:conference/calendar/ical/:session",
  dependencies: {
    legacy: LegacyRepo.use,
    appConfig: useAppConfig,
  },
  async handler({ params, legacy, appConfig }) {
    return LegacyApiError.wrap(async () => {
      // NOTE: locale is no longer mapped from authz token
      // maybe parse from Accept-Language header ?

      const conference = await legacy.assertConference(params.conference);
      const session = await legacy.assertSession(params.session, conference.id);

      const info = getConferenceInfo(conference, appConfig);

      return new Response(getSessionIcs(session, info), {
        headers: {
          "Content-Type": "text/calendar",
          "content-disposition": `attachment; filename="session.ics`,
        },
      });
    });
  },
});

// Calendar - getSessionGoogle
export const sessionGoogleCalRoute = defineRoute({
  method: "GET",
  pathname: "/legacy/:conference/calendar/google/:session",
  dependencies: {
    legacy: LegacyRepo.use,
    appConfig: useAppConfig,
  },
  async handler({ params, legacy, appConfig }) {
    return LegacyApiError.wrap(async () => {
      const conference = await legacy.assertConference(params.conference);
      const session = await legacy.assertSession(params.session, conference.id);

      return Response.redirect(getSessionGoogleCalUrl(session));
    });
  },
});

// Calendar - createUserCal
export const createUserCal = defineRoute({
  method: "GET",
  pathname: "/legacy/:conference/calendar/me",
  dependencies: {
    authz: useAuthz,
    legacy: LegacyRepo.use,
    appConfig: useAppConfig,
    tokens: useTokens,
  },
  async handler({ params, request, legacy, authz, appConfig, tokens }) {
    return LegacyApiError.wrap(async () => {
      const { userId } = await authz.assertUser(request, {
        scope: "user:legacy:calendar",
      });

      await legacy.assertRegistration(userId, params.conference);

      const token = await tokens.sign("legacy:calendar:self", { userId });

      return Response.json({
        url: new URL(
          `./legacy/${params.conference}/calendar/me/${token}`,
          appConfig.server.url,
        ),
      });
    });
  },
});

// Calendar - getUserIcs
export const getUserCal = defineRoute({
  method: "GET",
  pathname: "/legacy/:conference/calendar/me/:token",
  dependencies: {
    tokens: useTokens,
    legacy: LegacyRepo.use,
    appConfig: useAppConfig,
  },
  async handler({ params, tokens, legacy, appConfig }) {
    return LegacyApiError.wrap(async () => {
      const token = await tokens.verify(params.token);
      if (!token?.userId) throw HTTPError.unauthorized();

      const conference = await legacy.assertConference(params.conference);
      const registration = await legacy.assertRegistration(
        token.userId,
        conference.id,
      );

      const info = getConferenceInfo(conference, appConfig);

      const sessions = await legacy.listUserSessions(registration.id);

      return new Response(getSessionsIcal(sessions, info), {
        headers: {
          "Content-Type": "text/calendar",
          "content-disposition": `attachment; filename="session.ics`,
        },
      });
    });
  },
});
