import { prisma } from '../source/lib.js'

// https://www.prisma.io/docs/guides/database/seed-database

const summary = `Well hello, hello! Jeff Goldblum here, at your service. I hope you're having a most marvelous day, full of all sorts of unexpected adventures and delightful surprises. Life is a funny thing, isn't it? One moment you're here, the next you're there, and before you know it, you're off on a wild goose chase across the universe.`

const body = `# It's me Jeff Goldblum

Well hello, hello! Jeff Goldblum here, at your service. I hope you're having a most marvelous day, full of all sorts of unexpected adventures and delightful surprises. Life is a funny thing, isn't it? One moment you're here, the next you're there, and before you know it, you're off on a wild goose chase across the universe.

But that's what makes it all so exciting! I've always been a bit of a risk-taker, myself. I like to try new things, explore new places, and meet new people. You never know where your next great adventure might take you, or what amazing things you might discover along the way.

Of course, I'm also a bit of a performer at heart. Whether I'm playing a jazz tune on the piano, acting in a movie, or just having a conversation with someone new, I always try to bring my own unique style and flair to everything I do. There's just something about the energy and excitement of putting on a show that makes life worth living, don't you think?
`

const slotTime = new Date()
slotTime.setHours(10 + 3 * 24)

function slot(conferenceId) {
  const start = new Date(slotTime)
  slotTime.setMinutes(slotTime.getMinutes() + 30)
  return { conferenceId, start, end: slotTime }
}

async function main() {
  try {
    const conference = await prisma.conference.create({
      data: {
        slug: 'dog-con',
        name: 'Dog Conference',
        metadata: {},
        hooks: {
          create: {
            slug: 'refresh',
            url: 'https://example.com',
          },
        },
      },
    })
    await prisma.user.create({
      data: {
        email: 'tina@example.com',
        name: 'Tina Tinderbox',
        conferences: {
          create: [
            {
              conferenceId: conference.id,
              role: 'ADMIN',
            },
          ],
        },
      },
    })
    await prisma.user.create({
      data: {
        email: 'anya@example.com',
        name: 'Anya Cramlington',
        conferences: {
          create: [
            {
              conferenceId: conference.id,
              role: 'REGISTRATION',
            },
          ],
        },
      },
    })

    await prisma.user.create({
      data: {
        email: 'kareem@example.com',
        name: 'Kareem Munir',
      },
    })

    await prisma.taxonomy.create({
      data: {
        title: { en: 'Theme' },
        icon: 'tags',
        conferenceId: conference.id,
        terms: {
          create: [
            {
              id: 1,
              title: { en: 'Good doggos' },
              icon: 'star',
            },
            {
              id: 2,
              title: { en: 'Sleepy boys' },
              icon: 'zzz',
            },
          ],
        },
      },
    })
    await prisma.taxonomy.create({
      data: {
        title: { en: 'Format' },
        icon: 'cogs',
        conferenceId: conference.id,
        terms: {
          create: [
            {
              id: 3,
              title: { en: 'Keynote' },
            },
            {
              id: 4,
              title: { en: 'Workshop' },
            },
          ],
        },
      },
    })

    const slotA = await prisma.timeSlot.create({ data: slot(conference.id) })
    const slotB = await prisma.timeSlot.create({ data: slot(conference.id) })

    const sharedSpeaker = await prisma.sessionPerson.create({
      data: {
        name: 'Geoff Testington',
        bio: { en: body },
        links: { mastodon: 'https://example.social' },
      },
    })

    await prisma.session.create({
      data: {
        title: { en: 'Opening Ceremony' },
        metadata: {},
        summary: { en: summary },
        body: { en: body },
        conferenceId: conference.id,
        languages: ['en'],
        slotId: slotA.id,
        state: 'CONFIRMED',
        people: {
          connect: [{ id: sharedSpeaker.id }],
          create: [
            {
              name: 'Jas Smith',
              bio: { en: body },
              links: { mastodon: 'https://example.social' },
            },
            {
              name: 'Thomas Thompson',
              bio: { en: body },
              links: { linkedin: 'https://example.social' },
            },
          ],
        },
        terms: {
          connect: [{ id: 1 }, { id: 3 }],
        },
        links: {
          create: [
            {
              language: 'en',
              title: 'Zoom room',
              url: 'https://zoom.us/123456789',
            },
            {
              language: 'en',
              title: 'Worksheet',
              url: 'https://drive.google.com/123456789',
            },
          ],
        },
      },
    })

    await prisma.session.create({
      data: {
        title: { en: 'Bork-a-thon' },
        metadata: {},
        summary: { en: summary },
        body: { en: body },
        conferenceId: conference.id,
        languages: ['en'],
        slotId: slotB.id,
        state: 'CONFIRMED',
        people: {
          connect: [{ id: sharedSpeaker.id }],
        },
        terms: {
          connect: [{ id: 2 }, { id: 4 }],
        },
        links: {
          create: [
            {
              language: 'en',
              title: 'Live stream',
              url: 'https://twitch.tv/dog-radio',
            },
            {
              language: 'en',
              title: 'Miro board',
              url: 'https://miro.com/123456789',
            },
          ],
        },
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}

main()
