import path from 'node:path'

import KoaRouter from '@koa/router'
import { array, object, string, type } from 'superstruct'
import jwt from 'jsonwebtoken'

import {
  assertAuthz,
  assertConference,
  assertStruct,
  HttpError,
  prisma,
} from './lib.js'
import { appConfig } from './config.js'

const EmailLogin = object({
  email: string(),
  redirect: string(),
})
const EmailToken = type({
  sub: string(),
  roles: array(string()),
  redirect: string(),
  conf: string(),
})

export function authV1(prefix) {
  const router = new KoaRouter()

  router.post('/:conf/login/email', async (ctx) => {
    const conferenceId = await assertConference(ctx.params.conf)
    const body = assertStruct(ctx.request.body, EmailLogin)

    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
        conferences: {
          some: {
            conferenceId,
            role: {
              in: ['ADMIN', 'REGISTRATION'],
            },
          },
        },
      },
      include: {
        conferences: {
          where: { conferenceId },
        },
      },
    })

    if (!user) throw HttpError.unauthorized()

    const conf = ctx.params.conf
    const redirect = body.redirect // todo: validate URLs
    const roles = user.conferences.map((c) => c.role)

    const token = jwt.sign({ roles, redirect, conf }, appConfig.jwt.secret, {
      subject: `${user.id}`,
      issuer: appConfig.jwt.issuer,
      expiresIn: '30m',
    })

    // TODO: whats the best way to get the full URL of the magic link?
    const magicLink = new URL(
      path.join(prefix, ctx.params.conf, 'login/email', token),
      appConfig.selfUrl
    )

    // TODO: send email
    console.log('EMAIL:', magicLink.toString())

    ctx.body = 'ok'
  })

  router.get('/:conf/login/email/:token', (ctx) => {
    try {
      const { conf, roles, redirect, sub } = assertStruct(
        jwt.verify(ctx.params.token, appConfig.jwt.secret, {
          issuer: appConfig.jwt.issuer,
        }),
        EmailToken
      )

      const expires = new Date()
      expires.setDate(expires.getDate() + 7)

      ctx.cookies.set(
        'authToken',
        jwt.sign({ roles, conf }, appConfig.jwt.secret, {
          issuer: appConfig.jwt.issuer,
          subject: sub,
          expiresIn: '7d',
        }),
        { expires }
      )

      ctx.redirect(redirect)
    } catch (error) {
      console.error(error)
      throw HttpError.unauthorized()
    }
  })

  router.get('/:conf/me', async (ctx) => {
    const conferenceId = await assertConference(ctx.params.conf)

    const user = await prisma.user.findUnique({
      where: { id: assertAuthz(ctx, ctx.params.conf, 'REGISTRATION') },
      include: {
        conferences: {
          where: { conferenceId },
        },
      },
    })
    if (!user) throw HttpError.unauthorized()

    const { conferences, ...profile } = user
    const roles = conferences.map((r) => r.role)
    ctx.body = { ...profile, roles }
  })

  return router
}
