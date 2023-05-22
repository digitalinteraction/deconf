import KoaRouter from '@koa/router'
import { assertAuthz, assertConference, HttpError, prisma } from './lib.js'

export function scheduleV1() {
  const router = new KoaRouter()

  router.get('/:conf/everything', async (ctx) => {
    const conferenceId = await assertConference(ctx.params.conf)

    // TODO: relationship ids will be missing

    const sessions = await prisma.session.findMany({
      where: { conferenceId },
      select: {
        id: true,
        title: true,
        summary: true,
        slotId: true,
        languages: true,
        metadata: true,
        people: {
          select: {
            id: true,
            name: true,
            headshot: true,
          },
        },
        terms: true,
      },
    })

    const taxonomies = await prisma.taxonomy.findMany({
      where: { conferenceId },
      include: {
        terms: true,
      },
    })

    const slots = await prisma.timeSlot.findMany({
      where: { conferenceId },
    })

    ctx.body = { sessions, taxonomies, slots }
  })

  router.get('/:conf/sessions/:session/links', async (ctx) => {
    const conferenceId = await assertConference(ctx.params.conf)

    assertAuthz(ctx, ctx.params.conf, 'REGISTRATION')

    const session = await prisma.session.findFirst({
      where: {
        id: parseInt(ctx.params.session),
        conferenceId,
      },
      include: {
        links: true,
      },
    })
    if (!session) throw HttpError.notFound()

    // TODO: check auth

    ctx.body = session.links
  })

  return router
}
