import { defineRoute, HTTPError, includesScope } from "gruber";
import {
  LabelRecord,
  PersonRecord,
  SessionLinkRecord,
  SessionRecord,
  useAuthz,
  useStore,
} from "../lib/mod.js";
import { cache, LegacyRepo, TaxonomyDetails } from "./lib.js";

import * as deconf from "@openlab/deconf-shared";

function convertSessionState(state: string): deconf.SessionState {
  if (state === "accepted") return deconf.SessionState.accepted;
  if (state === "confirmed") return deconf.SessionState.confirmed;
  return deconf.SessionState.draft;
}

function convertSlot(record: SessionRecord): deconf.SessionSlot | null {
  if (!record.start_date || !record.end_date) return null;

  return {
    id: record.start_date.getTime() + "_" + record.end_date.getTime(),
    start: record.start_date,
    end: record.end_date,
  };
}

function convertPerson(record: PersonRecord): deconf.Speaker {
  return {
    id: record.id.toString(),
    name: record.name,
    role: { en: record.subtitle },
    bio: record.bio,
    // TODO: headshots x avatars
    metadata: record.metadata,
  } as deconf.Speaker;
}

function convertSession(
  record: SessionRecord,
  taxonomies: LegacyTaxes,
  people: PersonRecord[] = [],
  labels: LabelRecord[] = [],
): deconf.Session {
  const labelIds = new Set(labels.map((l) => l.id));

  const themes = taxonomies.theme.filter((t) => labelIds.has(t.id));
  const tracks = taxonomies.track.filter((t) => labelIds.has(t.id));
  const types = taxonomies.type.filter((t) => labelIds.has(t.id));

  return {
    id: record.id.toString(),
    type: types.map((t) => convertLabel(t).id)[0],
    slot: convertSlot(record)?.id,
    track: tracks.map((t) => convertLabel(t).id)[0],
    themes: themes.map((t) => convertLabel(t).id),
    coverImage: undefined,
    title: record.title,
    content: record.details,
    links: [],
    hostLanguages: record.languages.split(","),
    enableInterpretation: false,
    speakers: people.map((person) => convertPerson(person).id),
    hostOrganisation: {},
    isRecorded: false,
    isOfficial: false,
    isFeatured: false,
    visibility: deconf.SessionVisibility.public,
    state: convertSessionState(record.state),
    participantCap: null,

    hideFromSchedule: false,

    metadata: record.metadata,
  } as deconf.Session;
}

function convertLabel(record: LabelRecord): deconf.SessionType {
  return {
    id: record.id.toString(),
    title: record.title,
    iconGroup: "fas",
    iconName: "lightbulb",
    layout: "plenary",

    metadata: record.metadata,
  } as deconf.SessionType;
}

const fakeSettings: deconf.ConferenceConfig = {
  atrium: { enabled: true, visible: true },
  schedule: { enabled: true, visible: true },
  helpDesk: { enabled: true, visible: true },
  about: { enabled: true, visible: true },
  navigation: {},
  widgets: {},
} as any;

export async function getSchedule(
  legacy: LegacyRepo,
  conferenceId: number,
): Promise<deconf.ScheduleRecord> {
  const sessions = await legacy.listSessions(conferenceId);
  const people = await legacy.getGroupedPeople(conferenceId);
  const taxonomies = await legacy.listTaxonomies(conferenceId);
  const labels = await legacy.getGroupedLabels(conferenceId);

  const slots = new Map(
    sessions
      .map((s) => convertSlot(s))
      .filter((slot) => slot)
      .map((slot) => [slot!.id, slot!]),
  );

  const legacyTaxonomies = getLegacyTaxes(taxonomies);

  // const theme = getLegacyTax(taxonomies, "theme");
  // const track = getLegacyTax(taxonomies, "track");
  // const type = getLegacyTax(taxonomies, "type");

  // TODO: things need injecting onto the "SessionType" records
  // TODO: what to do with settings ...

  return {
    sessions: sessions.map((s) =>
      convertSession(
        s,
        legacyTaxonomies,
        people.grouped.get(s.id),
        labels.grouped.get(s.id),
      ),
    ),
    settings: fakeSettings,
    slots: Array.from(slots.values()),
    speakers: Array.from(people.all).map((p) => convertPerson(p)),
    themes: legacyTaxonomies.theme.map((l) => convertLabel(l)),
    tracks: legacyTaxonomies.track.map((l) => convertLabel(l)),
    types: legacyTaxonomies.type.map((l) => convertLabel(l)),
  };
}

// Conference - getSchedule
export const getScheduleRoute = defineRoute({
  method: "GET",
  pathname: "/legacy/:conference/schedule",
  dependencies: {
    legacy: LegacyRepo.use,
    store: useStore,
  },
  async handler({ params, legacy, store }) {
    const conf = await legacy.assertConference(params.conference);

    // Cache the schedule in redis for 5 minutes
    const schedule = await cache<deconf.ScheduleRecord>(
      store,
      `/legacy/${conf.id}/schedule`,
      5 * 60 * 1_000,
      () => getSchedule(legacy, conf.id),
    );

    return Response.json(schedule);
  },
});

export type LegacyTaxes = ReturnType<typeof getLegacyTaxes>;

function getLegacyTaxes(taxonomies: TaxonomyDetails[]) {
  return {
    theme: getLegacyTax(taxonomies, "themes"),
    track: getLegacyTax(taxonomies, "tracks"),
    type: getLegacyTax(taxonomies, "types"),
  };
}

type LegacyTax = "tracks" | "themes" | "types";

function getLegacyTax(taxonomies: TaxonomyDetails[], type: LegacyTax) {
  return (
    taxonomies.find((t) => `legacy/${t.metadata.ref}` === type)?.labels ?? []
  );
}

function convertLink(link: SessionLinkRecord): deconf.LocalisedLink {
  return {
    type: "",
    url: link.url.en!,
    title: link.title?.en,
    language: "en",
  };
}

// 30 minutes
const LINKS_GRACE_MS = 30 * 60 * 1000;

// Conference - getLinks
export const getSessionLinksRoute = defineRoute({
  method: "GET",
  pathname: "/legacy/:conference/schedule/:session/links",
  dependencies: {
    authz: useAuthz,
    legacy: LegacyRepo.use,
  },
  async handler({ request, params, authz, legacy }) {
    const { scope } = await authz.assertUser(request, {
      scope: "legacy:conference",
    });

    const session = await legacy.assertSession(
      params.session,
      params.conference,
    );
    if (!session?.start_date) throw HTTPError.notFound();

    const links = await legacy.listSessionLinks(session.id);

    // TODO: participantCap has been removed

    const isPublic = session.visibility === "public";
    const isAdmin = includesScope(scope, "admin");
    const timeUntil = session.start_date.getTime() - Date.now();
    if (!isPublic && !isAdmin && timeUntil > LINKS_GRACE_MS) {
      throw HTTPError.unauthorized();
    }

    return Response.json({
      links: links.map((l) => convertLink(l)),
    });
  },
});
