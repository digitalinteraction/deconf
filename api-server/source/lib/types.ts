// NOTE: generic could be on the class instead
export interface DeconfAuthen {
  emailAddress: string;
}

//
// Database types
//

export type ResourceKind = "atlases";
export type ResourceRole = "owner";
export type RecordMetadata = Record<string, any>;
export type Localised = Record<string, string | undefined>;

export interface UserRecord {
  id: number;
  created_at: Date;
  consented_at: Date;
  email: string;
  metadata: RecordMetadata;
}

export interface ConferenceRecord {
  id: number;
  created_at: Date;
  slug: string;
  title: Localised;
  metadata: RecordMetadata;
}

export interface AssetRecord {
  id: number;
  created_at: Date;
  title: Localised;
  url: string;
  conference_id: number;
  metadata: RecordMetadata;
}

export interface RegistrationRecord {
  id: number;
  created_at: Date;
  name: string;
  avatar_id: number | null;
  user_id: number;
  conference_id: number;
  role: "attendee" | "admin";
  metadata: RecordMetadata;
}

export interface TaxonomyRecord {
  id: number;
  created_at: Date;
  title: Localised;
  icon: string; // not mvp
  conference_id: number;
  metadata: RecordMetadata;
}

export interface LabelRecord {
  id: number;
  created_at: Date;
  title: Localised;
  icon: string; // not mvp
  taxonomy_id: number;
  metadata: RecordMetadata;
}

// TODO: a way of storing flags like "isFeatured"
export interface SessionRecord {
  id: number;
  created_at: Date;
  title: Localised;
  slug: string;
  summary: Localised;
  details: Localised;
  languages: string;
  state: "draft" | "accepted" | "confirmed";
  start_date: Date | null;
  end_date: Date | null;
  conference_id: number;
  metadata: RecordMetadata;
}

export interface SessionLinkRecord {
  id: number;
  created_at: Date;
  title: Localised;
  url: Localised;
  session_id: number;
  metadata: RecordMetadata;
}

export interface PersonRecord {
  id: number;
  created_at: Date;
  name: string;
  subtitle: string;
  bio: Localised;
  conference_id: number;
  avatar_id: number | null;
  metadata: RecordMetadata;
}

export interface SessionPersonRecord {
  id: number;
  created_at: Date;
  session_id: number;
  person_id: number;
}

export interface SessionSaveRecord {
  id: number;
  created_at: Date;
  session_id: number;
  registration_id: number;
}

export interface SessionLabelRecord {
  id: number;
  created_at: Date;
  session_id: number;
  label_id: number;
}

export interface LogRecord {
  id: number;
  created_at: Date;
  visitor_id: string;
  event: string;
  payload: unknown;
}

export interface ContentRecord {
  id: number;
  created_at: Date;
  slug: string;
  body: Record<string, string | undefined>;
  conference_id: number;
}

export interface Oauth2TokenRecord {
  id: number;
  created_at: Date;
  kind: string;
  scope: string;
  access_token: string;
  refresh_token: string | null;
  user_id: number;
  expires_at: Date | null;
}

export interface WebPushDeviceRecord {
  id: number;
  created_at: Date;
  registration_id: number;
  name: string;
  endpoint: string;
  keys: any;
  categories: string[];
  expires_at: Date | null;
}

export interface WebPushMessageRecord {
  id: number;
  created_at: Date;
  updated_at: Date;
  device_id: number;
  payload: any;
  retries: number;
  state: "pending" | "sent" | "failed";
}
