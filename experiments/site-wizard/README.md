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
- Its important to keep the configuration agnostic of the implementation (e.g. vue/scss)
- Its important to decide what should be `appConfig` vs the `env`,
  if not they should be merged.
- It probably makes sense to have different levels of navigation that can be configured,
  or at lease make the current navigation structure support more versions in the future.
  e.g. nesting the current `navigation` as `navigation.primary`.
- The `site.opengraph.{title,description}` can be removed in favour of the `site`
  values for now.
- It might be useful to have a custom protocol for the s3 assets, e.g. `deconf://uploads/asset.png`
  `new URL("uploads/script.js", "file:")` might also be an option to load any.
- It would be best to have as many strings in the config rather than i18n.

## links

- https://github.com/digitalinteraction/deconf-ui-toolkit

## experiment

**prerequisites**

- [Node.js v18+](https://nodejs.org/en/)
- [httpie](https://httpie.io/cli)

**setup**

```sh
# cd to/this/folder

# Install node dependencies for server & client
npm install
```

Make sure any assets referenced by `config.jsonc` are uploaded to the S3 bucket,
or cached locally in the `uploads/` folder.

**commands**

```sh
# cd to/this/folder

# Run the mock deconf-api server
node server/server.js

# Run the build
#   add --serve to serve on http://localhost:8080/
#   add --watch to watch for template changes and rebuild the site
node build-shallow.js
```

## future work

**important**

- Get the shallow template working with taxonomies
- Design how the css can be customised, maybe injecting scss variables
- Configure the `session` pages from their parent page

**other**

- Look into customising the "login", "profile" and "register" pages
- Think about modifying the SVGs so the `currentColor` is used properly
- Standardise the polymorphism with some notes on how it should be used
- Work out how apps can extend the markdown parsing with custom widgets, microservices?
- See if the login/register/profile pages can be customised via the "pages" array
- Evaluate use of relative files vs absolute vs custom schema.
- Embed the "title" for `LoginView` in the markdown
- Explore deeper builds with next versions of the framework
- Are there more types of filters that need to be defined?
- Evaluate the naming of the `branding` section and maybe include css customisation there too.
- Code `TODO:`'s in the shallow template
- Add route `meta` fields to customise the page title
- Add rest of the `views`
