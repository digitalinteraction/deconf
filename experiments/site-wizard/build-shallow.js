#!/usr/bin/env node

import "dotenv/config";

import fs from "fs/promises";
import path from "path";
import { createServer } from "http";

import serveHandler from "serve-handler";
import { globby } from "globby";
import nunjucks from "nunjucks";
import minio from "minio";

import { build } from "vite";
import vue from "@vitejs/plugin-vue2";
import yaml from "@rollup/plugin-yaml";

import { getConfig } from "./config.js";
import { find } from "./json-xpath.js";
import { baseFaIcons } from "./fontawesome.js";
import { getConfigJs, getIconsJs } from "./ast.js";

const {
  NODE_ENV = "production",
  S3_ACCESS_KEY,
  S3_BUCKET_NAME,
  S3_ENDPOINT,
  S3_SECRET_KEY,
} = process.env;

//
// Configuration that should be passed to ths wizard as parameters
//
const deploymentUrl = new URL("https://v1.dog-conf.deconf.app");
const s3Prefix = "site-wizard/shallow/";
// const cdnUrl = new URL("https://deconf-labs.ams3.cdn.digitaloceanspaces.com");

const s3 = new minio.Client({
  endPoint: S3_ENDPOINT,
  useSSL: true,
  accessKey: S3_ACCESS_KEY,
  secretKey: S3_SECRET_KEY,
});

const assetPaths = [
  "/site/customScripts/*",
  "/site/customStyles/*",
  "/site/opengraph/image",
  "/site/defaultHeadshot",
  "/navigation/*/icon",
  "/pages/*/home/hero/image",
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

const markdownPaths = [
  "/login/text",
  "/pages/*/home/content/subtitle",
  "/pages/*/sessionTimeline/subtitle",
  "/pages/*/sessionGrid/subtitle",
  "/pages/*/mySchedule/subtitle",
  "/pages/*/content/body",
];

async function isFile(file) {
  const stat = await fs.stat(file).catch(() => null);
  return stat?.isFile ?? false;
}

/** @param {Record<string,string>[]} allMarkdown */
function processMarkdown(allMarkdown) {
  const newAssets = [];
  for (const md of allMarkdown) {
    for (const locale in md) {
      // Make relative links absolute
      md[locale] = md[locale].replace(
        /!\[(.+)\]\((.+)\)/g,
        (substring, text, url) => {
          newAssets.push(url);
          return `![${text}](/${url})`;
        }
      );
    }
  }
  return { newAssets };
}

async function cacheObject(name, dir) {
  const target = path.join(dir, name);
  if (await isFile(target)) return;

  console.debug("Caching %o", name);
  return s3.fGetObject(S3_BUCKET_NAME, path.join(s3Prefix, name), target);
}

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

  const flags = {
    watch: process.argv.includes("--watch"),
    serve: process.argv.includes("--serve"),
  };

  // 1. Start with the template directory
  const tpldir = "template/shallow";

  //
  // 2. Prep assets and process config
  //
  const allAssets = assetPaths.flatMap((p) => find(config, p));
  const faIcons = baseFaIcons.concat(iconPaths.flatMap((p) => find(config, p)));
  const markdownResult = processMarkdown(
    markdownPaths.flatMap((p) => find(config, p))
  );
  allAssets.push(...markdownResult.newAssets);

  const cacheDir = path.join(tpldir, "public");
  await Promise.all(
    Array.from(new Set(allAssets)).map((name) => cacheObject(name, cacheDir))
  );

  //
  // 3. Process the template
  //
  await fs.writeFile(
    path.join(tpldir, "config.js"),
    getConfigJs(config, appEnv)
  );
  await fs.writeFile(
    path.join(tpldir, "icons.js"),
    getIconsJs(faIcons, config)
  );

  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader());
  const context = { ...config };

  env.addFilter("staticAsset", (file) => {
    console.debug("staticAsset path=%o", file);
    return path.join("public", file);
  });
  env.addFilter("fullUrl", (file) => {
    console.debug("fullUrl path=%o", file);
    return new URL(file, deploymentUrl).toString();
  });

  const templates = await globby(`${tpldir}/**/*.njk`);
  for (const file of templates) {
    await fs.writeFile(file.replace(/\.njk$/, ""), env.render(file, context));
  }

  //
  // 4. Bundle the app
  //
  await build({
    mode: NODE_ENV,
    root: tpldir,
    build: {
      outDir: "../../output/shallow",
      emptyOutDir: true,
      // sourcemap: true,
      watch: flags.watch,
    },
    resolve: {
      alias: { "~bulma": "bulma" },
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

  if (flags.serve) {
    const options = {
      public: "output/shallow",
      rewrites: [{ source: "**", destination: "/index.html" }],
    };
    const server = createServer((req, res) => serveHandler(req, res, options));
    server.listen(8080, () => console.log("Listening on :8080"));
  }
}

main();
