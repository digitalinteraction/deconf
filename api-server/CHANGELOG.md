# Change Log

This file documents changes to the Deconf API Server.

## next

- **new** web-push "test" endpoint
- **new** notify command to run notifications process
- **new** sign in with Google
- **fix** align web-push endpoints
- **fix** `metadata` columns are preserved when upserting registrations

## 0.2.4

- **improve** add "general/error" metric

## 0.2.3

- **fix** (auth) only email users that are registered

## 0.2.2

- **fix** (legacy conference) pull recorded + featured from session metadata

## 0.2.1

- **improve** (legacy calendar) set event location from session or conference
- **improve** (legacy calendar) set geo from conference
- **fix** legacy calendar returns private URLs correctly

## 0.2.0

- **new** add opt-in legacy metrics API
- **tweak** sending magic-links is opt-in when appending registrations
- **improve** login redirects with `?` or `#` params work
- **fix** clear legacy content cache when new content is uploaded
- **fix** redis keys are stored for the correct amount of time

## 0.1.2

- **new** Stage and diff assets during upsert-schedule & link them to people

## 0.1.1

🎉 Everything is new!
