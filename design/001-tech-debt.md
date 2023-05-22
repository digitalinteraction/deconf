---
created: 2023-05-22
---

# Technical debt

Looking at the current deconf codebases, there are several bits that need updating and modernising.

**vue-3** — The current UI is vue v2 which is legacy now. Upgrading to vue-3 would reduce the amount of JavaScript shipped to users and reduce the amount of vue code to write as the newer version is a lot terser.

**bulma** — [Bulma](https://bulma.io/) is the UI framework that the app is built on and it is quite outdated at this point, at this point I think it gets in the way more than it is useful especially with more and more modern css features being available to use. Something like [EveryLayout](https://every-layout.dev/) could do a lot of the heavy lifting where bulma is currently used. Or maybe Open Lab's [Alembic](https://alembic.openlab.dev/).

**mono-repo** — Having all of the code in separate repos adds quite a bit of overhead when making and releasing changes. A mono-repo approach could help to ease this and make release coordination easier.

**ESM** — Lots of the code isn't written in ESM, the not-so-new standard for JavaScript modules, which means newer tools aren't available to use as they have switched to ESM.

**More TypeScript** — Currently only the backend is written in TypeScript and the frontend is not. TypeScript on the frontend could help spot bugs sooner and help library-users integrate them with type-safety.

**Automated testing** — There are no tests for the frontend code which will likely lead to regressions in the future as the library is updated. There are some tests in the backend but the coverage could be higher.

**Breaking changes** — As versions of the libraries have been released certain things couldn't be changed to avoid introducing breaking changes, it would be good to do those changes at some point.
