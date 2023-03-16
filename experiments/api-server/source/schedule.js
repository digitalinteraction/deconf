import KoaRouter from '@koa/router'
import { HttpError, prisma } from './lib.js'

export function scheduleV1() {
  const router = new KoaRouter()

  router.get('/:conf/everything', async (ctx) => {
    const conference = await prisma.conference.findUnique({
      where: { slug: ctx.params.conf },
    })

    if (!conference) throw HttpError.notFound()
    const conferenceId = conference.id

    const sessions = await prisma.session.findMany({
      where: { conferenceId },
      include: {
        people: true,
        terms: true,
      },
    })

    const taxonomies = await prisma.taxonomy.findMany({
      where: { conferenceId },
      include: {
        terms: true,
      },
    })

    // TODO: session slots!

    ctx.body = { sessions, taxonomies }
  })

  return router
}
