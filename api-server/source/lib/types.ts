export type RecordMetadata = Record<string, any>
export type Localised = Record<string, string | undefined>

export interface UserRecord {
  id: number
  created: Date
  consented: Date
  email: string
  metadata: RecordMetadata
}

export interface ConferenceRecord {
  id: number
  created: Date
  slug: string
  title: Localised
  metadata: RecordMetadata
}

export interface RegistrationRecord {
  id: number
  created: Date
  name: string
  // avatar: string // not mvp
  user_id: number
  conference_id: number
  role: 'attendee' | 'admin'
  metadata: RecordMetadata
}

export interface TaxonomyRecord {
  id: number
  created: Date
  title: Localised
  icon: string // not mvp
  conference_id: number
}

export interface LabelRecord {
  id: number
  created: Date
  title: Localised
  icon: string // not mvp
  taxonomy_id: number
}

// TODO: a way of storing flags like "isFeatured"
export interface SessionRecord {
  id: number
  created: Date
  title: Localised
  summary: Localised
  details: Localised
  languages: string
  state: 'draft' | 'accepted' | 'confirmed'
  start: Date | null
  end: Date | null
  conference_id: number
}

export interface SessionLinkRecord {
  id: number
  created: Date
  title: Localised
  url: string
  language: string
  session_id: number
}

export interface AssetRecord {
  id: number
  created: Date
  title: Localised
  url: string
  conference_id: number
}

export interface PersonRecord {
  id: number
  created: Date
  name: string
  subtitle: string
  bio: Localised
  conference_id: number
  avatar_id: number
}

export interface SessionPersonRecord {
  id: number
  created: Date
  session_id: number
  person_id: number
}

export interface SessionSaveRecord {
  id: number
  created: Date
  session_id: number
  registration_id: number
}

export interface SessionLabelRecord {
  id: number
  created: Date
  session_id: number
  label_id: number
}
