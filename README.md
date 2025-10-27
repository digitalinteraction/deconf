# Deconf

This repository contains information about the Deconf OSS project.

## About

Deconf is a platform and toolkit that helps facilitate virtual, physical and hybrid conferences. It is an Open Source project created by [Open Lab](http://openlab.ncl.ac.uk/) and has been used for many events from different organisations, including the IFRC & Mozilla Foundation.

### Core team

- [Rob Anderson](https://www.r0b.io/) - Lead Enginner

### Collaborators

- [Tom Nappey](https://openlab.ncl.ac.uk/people/tom-nappey/) - Lead Designer
- [Tom Feltwell](https://openlab.ncl.ac.uk/people/tom-feltwell/) - Chatbot Engineer
- [Simon Bowen](https://openlab.ncl.ac.uk/people/simon-bowen/) - Project Coordinator
- [Ed Jenkins](https://edjenkins.co.uk/) - Frontend Engineer
- [Andy Garbett](http://andygarbett.co.uk/) - Coffeechat Engineer
- [Gerard Wilkinson](https://gerardwilkinson.com/) - Coffeechat Engineer

## Overview

Deconf is currently being restructured to encorporate all of the learnings from the conferences run from it.
The new architecture features an [api-server](./api-server) with an improved malleable data structure to store any conference data.
The new server also includes "legacy" endpoints that maintain backwards compatability with `deconf-api-toolkit`.

> More info coming soon…

Deconf is currently made up of several repositories under the `digitalinteraction` organisation and each repository starts with `deconf`.

- [digitalinteraction/deconf-shared](https://github.com/digitalinteraction/deconf-shared) —
  A package of TypeScript types to be shared between the ui and api toolkits
- [digitalinteraction/deconf-api-toolkit](https://github.com/digitalinteraction/deconf-api-toolkit) —
  An Node.js library for creating conference backend servers.
- [digitalinteraction/deconf-ui-toolkit](https://github.com/digitalinteraction/deconf-ui-toolkit) —
  A Vue.js component library and [storybook](https://deconf.openlab.dev/) environment

## Design

**Scalable** — Deconf is designed to run with thousands of concurrent visitors. The infrastructure is designed to run as stateless containers that scale horizontally to accomodate more and more traffic. Decisions favor up-front computation so the visitor experience is as uncomputational as possible. The internal schedule information is processed in the background, not on-demand and the client app is a bundled SPA requiring even less server computation.

**Agnostic** — Deconf is built to work with as many different platforms as possible. It doesn't provide any video streaming out of the box but instead makes it easy to get visitors into a Zoom room, watch a Vimeo livestream or prerecorded YouTube video.

**Customisable** — Deconf is a library for making your own conference platform, not a SaaS platform you go to to host something. This allows deployments created with the library can be completely bespoke and not something generic. The api and ui libraries are build up of modules that you can swap in and out to customise everything.

## Features

- An Atrium, which is the homepage for attendees with live stats, helpful links to get about and embedded onboarding media.
- A "Session Grid" page to show subsets of sessions in a non-temporal format.
- A chronological schedule page that groups sessions by start/end time and prioratises sessions that are live
- Detailed pages for each session with relevant links and embeds, for example, embedding a YouTube video or a Zoom call-to-action and linking to a Miro board
- Registration and magic-link based login pages to quickly get into the conference via an email
- Real-time interpretation during live events, so attendees can tune-in to live interpretation and experience the conference in English, French, Spanish or Arabic
- All copy is built to be localised to it can be customised or translated as required and the ui is built for RTL and LTR orientations.

## Deployments

Each conference has been used to testing the capabilities of the software and to iterate upon it, to encorporate changes, improvements and fix bugs. Some conferences include:

- [ClimateRed 2020](https://climate-red.openlab.dev/atrium)
- PlanetRed 2021
- [MozFest 2021—2025](https://schedule.mozillafestival.org)
- [PDC 2022](https://schedule.pdc2022.org/#/atrium)
- [ECSCW 2025](https://ecscw.openlab.dev/#/atrium)

## History

2020 — climate:red was the first prototype and is what the initial version of the libraries were based on, [more info](https://github.com/digitalinteraction/climatered).

2021 — [MozFest](https://www.mozillafestival.org) was the first deployment of Deconf. The libraries were made to adapt the logic from climate:red so it could be repurposed for MozFest.

2021 — planet:Red was the next deployment. It was used to convert climate:red into a Deconf deployment as the initial prototype contained no shared code. It was a good opportunity to refine the libraries to make them more customisable and add new features/configurations based on the MozFest deployment. This lead to lots of breaking changes but ended up with more flexible APIs and components.

2022-2025 — MozFest has continued to refine the libraries and add features back to the project

## Future work

- Much more detailed documentation for using the libraries
- More work on the deconf libraries, moving more features across and improving
- Migrate planet:Red's interpretation interface into the ui library so the library can offer a complete interpretation flow
- Make the UI components even more flexible to allow for more uses and potentially a data-driven / CMS approach
- Explore virtual-physical uses to create engaging hybrid engagements
