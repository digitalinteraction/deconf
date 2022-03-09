# Deconf

This repository contains information about the Deconf OSS project.

## About

Deconf is an Open Source library for building virtual conference platforms developed by [Open Lab at Newcastle University](http://openlab.ncl.ac.uk/). It has been developed with the learnings of running several online conferences since 2020.

### Core team

* [Rob Anderson](https://www.r0b.io/) - Lead Enginner

### Collaborators

- [Tom Nappey](https://openlab.ncl.ac.uk/people/tom-nappey/) - Lead Designer
- [Tom Feltwell](https://openlab.ncl.ac.uk/people/tom-feltwell/) - Chatbot Engineer
- [Simon Bowen](https://openlab.ncl.ac.uk/people/simon-bowen/) - Project Coordinator
- [Ed Jenkins](https://edjenkins.co.uk/) - Frontend Engineer
- [Andy Garbett](http://andygarbett.co.uk/) - Coffeechat Engineer
- [Gerard Wilkinson](https://gerardwilkinson.com/) - Coffeechat Engineer

## Overview

Deconf is made up of several repositories under the `digitalinteraction` organisation and each repository starts with `deconf`.

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

## History

[climate:red 2020](https://climate.red) was the first prototype for Deconf and is what the initial version of the libraries were based on, [more info](https://github.com/digitalinteraction/climatered).

[MozFest 2021](https://www.mozillafestival.org) was the first deployment of Deconf. The libraries were made to adapt the logic from climate:red so it could be repurposed for MozFest.

[planet:Red](https://planetredsummit.com) was the next deployment of Deconf. It was used to convert planet:red into a Deconf deployment as the initial prototype contained no shared code in the end. It was a good oppertunity to refine the Deconf libraries to make them more customisable and add new features/configurations based on the MozFest deployment. This lead to lots of breaking changes but ended up with more flexible APIs and components.

[MozFest 2022](https://www.mozillafestival.org) was the next deployment of Deconf which nicely inherited lots of improvements from the planet:Red deployment and added back more customisations and configurations to the libraries.

## Future work

- Much more detailed documentation for using the libraries
- More work on the deconf libraries, moving more features across and improving
- Migrate planet:Red's interpretation interface into the ui library so the library can offer a complete interpretation flow
- Make the UI components even more flexible to allow for more uses and potentially a data-driven / CMS approach
- Explore virtual-physical uses to create engaging hybrid engagements
