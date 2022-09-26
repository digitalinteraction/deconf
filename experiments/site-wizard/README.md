# site-wizard

## goal

Exploring how can a deconf client app be generated from a single input

## structure

- `server/` — A deconf-compliant api server, using entierly mock data
- `output/` — (git-ignored) Where the client is built into
- `template/shallow/` — The template to build the client from with some git-ignored generated assets
  - `public/` — has the relevant bucket files
  - `v0` — Is the components for each page with the `page` as a prop from the `config.json`
  - `lib.js` — has extra utils for generating the client
  - `main.js` — is the client entrypoint
  - `router.js` — creates a vue-router based on the pages from the `config.json`
  - `views.js` — provides a factory for creating dynamic imports for versioned pages
- `uploads/` — The contents of the associated S3 bucket, files get cached here and linked into the template
- `ast.js` — Experimenting with generating JavaScript from Abstract Syntax Trees
- `build-shallow.js` — Build the "shallow" template
- `config.js` — Read in the json config and validate its form
- `config.jsonc` — The config for the static site to be generated
- `fontawesome.js` — Utilities for interacting with fontawesome
- `json-xpath.js` — A utility to query values from JSON based on xpath

## TODO

- [ ] Look into customising the styles.

## notes

- There are different levels that the client be generated, `shallow` is explored most so far.
  In the future there could be tighter integration with the ui library (vue).
  - `shallow` focuses on re-using the existing libraries for as simple-a-possible generation
- Code generation is needed to generate files based on the configuration
  - `config.js` exposes the raw `config.json` and extra environment variables.
  - `icons.js` exposes the fontawesome icons that are needed (from the config file)
    and icons to be embedded.
  - `index.html` is generated through nunjucks with special filters for assets
- You can generate code with string templating which is quick and dirty

## links

- ...

## experiment
