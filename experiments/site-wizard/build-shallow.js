#!/usr/bin/env node

import "dotenv/config";

import fs from "fs/promises";
import path from "path";
import { createServer } from "http";
import { promisify } from "util";
import cp from "child_process";

import dedent from "dedent";
import serveHandler from "serve-handler";
import { globby } from "globby";
import nunjucks from "nunjucks";
import minio from "minio";

import { build } from "vite";
import vue from "@vitejs/plugin-vue2";
import yaml from "@rollup/plugin-yaml";

import { getConfig } from "./config.js";
import { find } from "./json-xpath.js";
import { baseFaIcons, fontawesomeImports } from "./fontawesome.js";

const {
  NODE_ENV = "production",
  S3_ACCESS_KEY,
  S3_BUCKET_NAME,
  S3_ENDPOINT,
  S3_SECRET_KEY,
} = process.env;
const exec = promisify(cp.exec);

// TODO:
// - embed SVG icons

//
// Configuration that should be passed to ths wizard as parameters
//
const deploymentUrl = new URL("https://v1.dog-conf.deconf.app");
const s3Prefix = "site-wizard/shallow/";
const cdnUrl = new URL("https://deconf-labs.ams3.cdn.digitaloceanspaces.com");

const s3 = new minio.Client({
  endPoint: S3_ENDPOINT,
  useSSL: true,
  accessKey: S3_ACCESS_KEY,
  secretKey: S3_SECRET_KEY,
});

/** @param {Map<string, [string,string]>} faIcons */
async function createIconsJs(faIcons, config) {
  const icons = Array.from(faIcons.values());

  /** @type {Record<string, Set<string>>}  */
  const usage = {
    fas: new Set(),
    far: new Set(),
    fab: new Set(),
  };
  for (const icon of icons) {
    const set = usage[icon[0]];
    if (!set) throw new Error(`Unknown icon set '${icon[0]}'`);
    set.add(icon[1]);
  }

  const prefix = dedent`
    import { library } from '@fortawesome/fontawesome-svg-core'
    import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  `;
  const suffix = dedent`
    export class FontawesomePlugin {
      static install(Vue) {
        Vue.component('fa-icon', FontAwesomeIcon);
      }
    }
  `;

  /** @param {string} i */
  const iconName = (i) => {
    const parts = i
      .split(/-+/)
      .map((p) => p.slice(0, 1).toLocaleUpperCase() + p.slice(1));
    return "fa" + parts.join("");
  };

  const imports = Object.entries(usage)
    .filter((entry) => entry[1].size > 0)
    .map(
      ([kind, icons]) => dedent`
      import {
        ${Array.from(icons)
          .map((i) => iconName(i))
          .join(", ")}
      } from "${fontawesomeImports[kind]}";`
    )
    .join("\n");

  const libraryAdditions = dedent`
    library.add(${Object.values(usage)
      .flatMap((s) => Array.from(s))
      .map((i) => iconName(i))
      .join(", ")})
    `;

  const names = new Map();
  const embeds = [];
  for (const item of config.navigation) {
    if (names.has(item.icon)) continue;
    const name = `icon${names.size}`;
    names.set(item.icon, name);
    embeds.push(
      `import ${name} from "./${path.join("assets", item.icon)}?raw";`
    );
  }
  const namedIcons = Array.from(names.entries())
    .map((entry) => `"${entry[0]}": ${entry[1]}`)
    .join(", ");
  const navIcons = dedent`
    ${embeds.join("\n")}

    export const navIcons = { ${namedIcons} }
  `;

  return [prefix, imports, navIcons, libraryAdditions, suffix].join("\n\n");
}
function createConfigJs(config, env) {
  return dedent`
    import { deepSeal } from '@openlab/deconf-ui-toolkit'
    export const appConfig = deepSeal(JSON.parse(${JSON.stringify(
      JSON.stringify(config)
    )}));
    export const env = deepSeal(JSON.parse(${JSON.stringify(
      JSON.stringify(env)
    )}));
  `;
}

const assetPaths = [
  "/site/customScripts/*",
  "/site/customStyles/*",
  "/site/opengraph/image",
  "/navigation/*/icon",
  "/pages/*/home/sponsors/*/sponsors/*/image",
  "/branding/primary/url",
  "/branding/secondary/url",
  "/branding/tabs/url",
];

const iconPaths = [
  "/pages/*/home/widgets/*/builtin/faIcon",
  "/pages/*/home/widgets/*/page/faIcon",
  "/pages/*/home/widgets/*/url/faIcon",
  "/taxonomies/*/faIcon",
  "/taxonomies/*/options/*/faIcon",
];

async function main() {
  const config = await getConfig();
  config.site.url = deploymentUrl.toString();

  // TODO: should these be merged into appConfig?
  const appEnv = {
    SELF_URL: "http://localhost:8080/",
    SERVER_URL: "http://localhost:3000/",
    BUILD_NAME: "v1.2.3",
    JWT_ISSUER: "deconf-dev",
    DISABLE_SOCKETS: false,
    APP_NAME: "Merlin",
    APP_VERSION: "0.0.1",
  };

  // 1. Clone the template
  const tmpdir = await fs.mkdtemp("shallow_");
  await fs.mkdir(tmpdir, { recursive: true });
  await exec(`cp -R template/shallow/* ${tmpdir}`);

  async function cacheObject(name) {
    console.debug("Cache %o", name);
    return s3.fGetObject(
      S3_BUCKET_NAME,
      path.join(s3Prefix, name),
      path.join(tmpdir, "assets", name)
    );
  }

  try {
    // 2. Prep assets
    const allAssets = assetPaths.flatMap((p) => find(config, p));
    const faIcons = baseFaIcons.concat(
      iconPaths.flatMap((p) => find(config, p))
    );

    await Promise.all(
      Array.from(new Set(allAssets)).map((p) => cacheObject(p))
    );

    // 3. Process the template
    await fs.writeFile(
      path.join(tmpdir, "config.js"),
      createConfigJs(config, appEnv)
    );
    await fs.writeFile(
      path.join(tmpdir, "icons.js"),
      await createIconsJs(faIcons, config, tmpdir)
    );

    const env = new nunjucks.Environment(new nunjucks.FileSystemLoader());
    const context = { ...config };

    env.addFilter("staticAsset", (file) => {
      console.debug("staticAsset path=%o", file);
      // const url = new URL(path.join(s3Prefix, file), cdnUrl);
      // return url.toString();
      return path.join("assets", file);
    });

    const templates = await globby(`${tmpdir}/**/*.njk`);
    for (const file of templates) {
      await fs.writeFile(file.replace(/\.njk$/, ""), env.render(file, context));
      await fs.unlink(file);
    }

    // 4. Bundle the app
    await build({
      mode: NODE_ENV,
      root: tmpdir,
      publicDir: "assets",
      build: {
        outDir: "../output/shallow",
        emptyOutDir: true,
        sourcemap: true,
        assetsDir: "dist",
        watch: process.argv.includes("--watch"),
      },
      resolve: {
        alias: {
          "~bulma": "bulma",
        },
      },
      plugins: [vue(), yaml()],
      css: {
        preprocessorOptions: {
          scss: {
            additionalData: '@import "/base.scss";',
          },
        },
      },
    });

    await fs.mkdir(path.join("output/shallow/assets"), { recursive: true });
    await exec(`cp -R ${tmpdir}/assets/ output/shallow/assets/`);

    if (process.argv.includes("--serve")) {
      const options = {
        public: "output/shallow",
        rewrites: [{ source: "**", destination: "/index.html" }],
      };
      const server = createServer((req, res) =>
        serveHandler(req, res, options)
      );
      server.listen(8080, () => console.log("Listening on :8080"));
    }
  } finally {
    if (!process.argv.includes("--keep") && !process.argv.includes("--watch")) {
      await exec(`rm -r ${tmpdir}`);
    }
  }
}

main();
