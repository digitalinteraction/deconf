// Content - get

import { defineRoute, HTTPError } from 'gruber'
import { Sql } from 'postgres'
import { marked } from 'marked'
import * as deconf from '@openlab/deconf-shared'
import { assertConference, cache } from './lib.js'
import { ContentRecord, useDatabase, useStore } from '../lib/mod.js'

export async function getContent(
  sql: Sql,
  conferenceId: number,
  slug: string,
): Promise<ContentRecord | null> {
  const [record = null] = await sql<ContentRecord[]>`
    SELECT id, created, slug, body, conference_id
    FROM content
    WHERE slug = ${slug} AND conference_id = ${conferenceId}
  `
  return record
}

// NOTE: I think the widgets in markdown should just be custom HTML elements that the client can register and pick up

function processMarkdown(
  input: Record<string, string | undefined>,
): deconf.LocalisedContent {
  const output: deconf.LocalisedContent = {
    content: {},
  }

  for (const [key, value] of Object.entries(input)) {
    output.content[key] = marked(value as string, { async: false })
  }

  return output
}

type ContentKey = [
  `/legacy/${number}/content/${string}`,
  deconf.LocalisedContent,
]

export const getContentRoute = defineRoute({
  method: 'GET',
  pathname: '/legacy/:conference/content/:key',
  async handler({ params }) {
    const sql = useDatabase()
    const store = await useStore()
    const conf = await assertConference(sql, params.conference)

    const content = await cache<ContentKey>(
      store,
      `/legacy/${conf.id}/content/${params.key}`,
      15 * 60,
      async () => {
        const record = await getContent(sql, conf.id, params.key)
        return record ? processMarkdown(record.body) : null
      },
    )
    if (!content) throw HTTPError.notFound()

    return Response.json(content)
  },
})
