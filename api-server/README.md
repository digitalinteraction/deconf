# deconf-next

This is a multi-instanced headless API for running deconf conferences.
It part of a wider ecosytem

- **data-types** — common format for conference information
- **api-server** — an off-the-shelf server to host deconf data
- **ui-library** — a set of white-labelled components to interact with deconf data ~ "lanyard" ?
- **web-app** — an off-the-shelf app for running a generic conference (?)
- **api-client** — a JavaScript client for talking to the api from web-like environments

The headless API approach means that:

- adminstration could be a UI for admins or RESTful calls to other services to fetch data
- the front-end can be completely swapped out or used in different ways or different ui-library compositions
  or event a static-site generator
- satelite app can use it to provide bespoke functionality alongside a common core using admin APIs,
  ie pull in data from pretalx

## Data types

This section is sketching out the data types (for now)

```bash
User { email, metadata }

Conference { slug, title, metadata }

Asset { title, url, conference_id }

Registration { name, avatar_id, user_id, conference_id, role }
# answers field?

Taxonomy { title, icon, conference_id, metadata }
Label { title, icon, taxonomy_id, metadata }

Session { slug, title, summary, details, languages, state, start_date, end_date, conference_id, metadata }
# answers field?

SessionLink { title, url, session_id }

People { name, subtitle, bio, conference_id, avatar_id }
SessionPeople { session_id, person_id }

SessionSave { session_id, registration_id }
# user_id or registration_id ?

SessionLabel { session_id, label_id }

Content { slug, text, conference_id }

UserOauth2 { kind, scope, access_token, refresh_token, expires_at, user_id }

WebPushDevice { registration_id, name, endpoint, keys, categories, expires_at }
# one per conference?

WebPushMessage { updated_at, device_id, payload, retries, state }
```

Notes:

- **General** — most records should have an `id`, `created_at` & `updated_at`, maybe `metadata` too
- **Localisation** — To localise data-types, values are stored as JSON within the record
- These were written after the `migrations` and I tweaked them a bit as I was going

Thoughts:

- How should dates be named? `start_date` or `created_at`
- How should links cascade localisation?

## Endpoints

**legacy**

```bash
# attendance
POST /legacy/:conference/attendance/:session/attend
POST /legacy/:conference/attendance/:session/unattend
GET  /legacy/:conference/attendance/:session
GET  /legacy/:conference/attendance/me

# Calendar
GET  /legacy/:conference/calendar/ical/:session
GET  /legacy/:conference/calendar/google/:session
GET  /legacy/:conference/calendar/me
GET  /legacy/:conference/calendar/me/:token

# Conference
GET  /legacy/:conference/schedule
GET  /legacy/:conference/schedule/:session/links

# Content
GET  /legacy/content/:slug
```

**conference v1**

```bash
GET  /conf/v1/conference/:conference/taxonomies
GET  /conf/v1/conference/:conference/sessions
GET  /conf/v1/conference/:conference/people

POST /conf/v1/conference/:conference/session/:session/save
DEL  /conf/v1/conference/:conference/session/:session/save
GET  /conf/v1/conference/:conference/saves
GET  /conf/v1/conference/:conference/session/:session/links
```

**admin**

```bash
PUT   /admin/v1/conference/:conference/schedule
PUT   /admin/v1/conference/:conference/registrations
PATCH /admin/v1/conference/:conference/user
```

- store pretalx API ids in session/label/people "metadata" for sync
- big endpoints that do the diff and update records
- pretalx can replace the content in one
- tito can replace the content periodically and incrementally add

**potential sidecars**

- Google calendar sync — pull down saved sessions and create calendar events
  - list users with `googleCalId` in their metadata
  - get active oauth2
  - list saved sessions
  - update google calendar w/ a diff
- Fetch content from pretalx
  - get content from pretalx API
  - list sessions, taxonomies, labels, speakers
  - update schedule w/ a diff
- Fetch users from tito
  - list tickets
  - list users & registrations
  - update users/registrations w/ a diff
- Incrementally add tito registrations
  - recieve a webhook
  - upsert the user/registration

**auth**

```bash
# TODO: ...

PATCH /.../registration/me
```

**notifications**

```bash
GET   /notifications/v1/web-push/credentials
GET   /notifications/v1/web-push/devices
POST  /notifications/v1/web-push/devices
PATCH /notifications/v1/web-push/devices/:device
DEL   /notifications/v1/web-push/devices/:device
POST  /notifications/v1/web-push/test
```
