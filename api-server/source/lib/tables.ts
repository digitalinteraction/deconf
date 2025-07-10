import { Structure } from "gruber";
import { defineTable, localisedStructure } from "./gruber-hacks.ts";
import {
  AssetRecord,
  ConferenceRecord,
  ContentRecord,
  LabelRecord,
  LogRecord,
  Oauth2TokenRecord,
  PersonRecord,
  RegistrationRecord,
  SessionLabelRecord,
  SessionLinkRecord,
  SessionPersonRecord,
  SessionRecord,
  SessionSaveRecord,
  TaxonomyRecord,
  UserRecord,
  WebPushDeviceRecord,
  WebPushMessageRecord,
} from "./types.ts";

function nullable<T>(value: Structure<T>) {
  return Structure.union([value, Structure.null()]);
}

// IDEA: ...
// export type User = InferTable<typeof UserTable>;
// export type Conference = InferTable<typeof ConferenceTable>;

// Note: I'm prefering hard-types for records, it makes them much easier to consume
// and forces you to double check everything

export const UserTable = defineTable<UserRecord>({
  table: "users",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    consented_at: Structure.date(),
    email: Structure.string(),
    metadata: Structure.any(),
  },
});

export const ConferenceTable = defineTable<ConferenceRecord>({
  table: "conferences",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    slug: Structure.string(),
    title: localisedStructure(),
    metadata: Structure.any(),
  },
});

export const AssetTable = defineTable<AssetRecord>({
  table: "assets",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    title: localisedStructure(),
    url: Structure.string(),
    conference_id: Structure.number(),
    metadata: Structure.any(),
  },
});

export const RegistrationTable = defineTable<RegistrationRecord>({
  table: "registrations",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    name: Structure.string(),
    avatar_id: nullable(Structure.number()),
    user_id: Structure.number(),
    conference_id: Structure.number(),
    role: Structure.union([
      Structure.literal("attendee"),
      Structure.literal("admin"),
    ]),
    metadata: Structure.any(),
  },
});

export const TaxonomyTable = defineTable<TaxonomyRecord>({
  table: "taxonomies",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    title: localisedStructure(),
    icon: Structure.string(""),
    conference_id: Structure.number(),
    metadata: Structure.any(),
  },
});

export const LabelTable = defineTable<LabelRecord>({
  table: "labels",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    title: localisedStructure(),
    icon: Structure.string(""),
    taxonomy_id: Structure.number(),
    metadata: Structure.any(),
  },
});

export const SessionTable = defineTable<SessionRecord>({
  table: "sessions",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    title: localisedStructure(),
    slug: Structure.string(),
    summary: localisedStructure(),
    details: localisedStructure(),
    languages: Structure.string(),
    visibility: Structure.union([
      Structure.literal("public"),
      Structure.literal("private"),
    ]),
    state: Structure.union([
      Structure.literal("draft"),
      Structure.literal("accepted"),
      Structure.literal("confirmed"),
    ]),
    start_date: nullable(Structure.date()),
    end_date: nullable(Structure.date()),
    conference_id: Structure.number(),
    metadata: Structure.any(),
  },
});

export const SessionLinkTable = defineTable<SessionLinkRecord>({
  table: "session_links",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    title: localisedStructure(),
    url: localisedStructure(),
    session_id: Structure.number(),
    metadata: Structure.any(),
  },
});

export const PersonTable = defineTable<PersonRecord>({
  table: "people",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    name: Structure.string(),
    subtitle: Structure.string(),
    bio: localisedStructure(),
    conference_id: Structure.number(),
    avatar_id: nullable(Structure.number()),
    metadata: Structure.any(),
  },
});

export const SessionPersonTable = defineTable<SessionPersonRecord>({
  table: "session_people",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    session_id: Structure.number(),
    person_id: Structure.number(),
  },
});

export const SessionSaveTable = defineTable<SessionSaveRecord>({
  table: "session_saves",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    session_id: Structure.number(),
    registration_id: Structure.number(),
  },
});

export const SessionLabelTable = defineTable<SessionLabelRecord>({
  table: "session_labels",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    session_id: Structure.number(),
    label_id: Structure.number(),
  },
});

export const LogTable = defineTable<LogRecord>({
  table: "logs",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    visitor_id: Structure.string(),
    event: Structure.string(),
    payload: Structure.any(),
  },
});

export const ContentTable = defineTable<ContentRecord>({
  table: "content",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    slug: Structure.string(),
    content_type: Structure.string(),
    body: localisedStructure(),
    conference_id: Structure.number(),
    metadata: Structure.any(),
  },
});

export const OAuth2TokenTable = defineTable<Oauth2TokenRecord>({
  table: "oauth2_tokens",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    kind: Structure.string(),
    scope: Structure.string(),
    access_token: Structure.string(),
    refresh_token: nullable(Structure.string()),
    user_id: Structure.number(),
    expires_at: nullable(Structure.date()),
  },
});

export const WebPushDeviceTable = defineTable<WebPushDeviceRecord>({
  table: "web_push_devices",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    registration_id: Structure.number(),
    name: Structure.string(),
    endpoint: Structure.string(),
    keys: Structure.any(),
    categories: Structure.array(Structure.string()),
    expires_at: nullable(Structure.date()),
  },
});

export const WebPushMessageTable = defineTable<WebPushMessageRecord>({
  table: "web_push_messages",
  fields: {
    id: Structure.number(),
    created_at: Structure.date(),
    updated_at: Structure.date(),
    device_id: Structure.number(),
    payload: Structure.any(),
    retries: Structure.number(),
    state: Structure.union([
      Structure.literal("pending"),
      Structure.literal("sent"),
      Structure.literal("failed"),
    ]),
  },
});
