#!/usr/bin/env node

import "dotenv/config";

import fs from "fs/promises";
import path from "path";
import { createServer } from "http";
import { promisify } from "util";
import cp from "child_process";

// import dedent from "dedent";
import serveHandler from "serve-handler";
import { Parcel } from "@parcel/core";
import { globby } from "globby";
import nunjucks from "nunjucks";
import minio from "minio";

import { getConfig } from "./config.js";

const {
  NODE_ENV = "production",
  S3_ACCESS_KEY,
  S3_BUCKET_NAME,
  S3_ENDPOINT,
  S3_SECRET_KEY,
} = process.env;
const exec = promisify(cp.exec);

/** @param {string} input */
function safeJson(input) {
  return input.replaceAll(/'/g, "\\'").replaceAll(/\\n/g, "\\\\n");
}

// TODO:
// - fontawesome stuff
// - embed SVG icons
// - work out how to do assets from CDN/uploads

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

async function main() {
  const config = await getConfig();
  config.site.url = deploymentUrl.toString();

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
    for (const script of config.site.customScripts) await cacheObject(script);
    for (const style of config.site.customStyles) await cacheObject(style);
    if (config.site.opengraph.image) {
      await cacheObject(config.site.opengraph.image);
    }
    for (const item of config.navigation) await cacheObject(item.icon);
    for (const page of config.pages) {
      if (page.type === "home") {
        for (const group of page.home.sponsors) {
          for (const sponsor of group.sponsors) {
            await cacheObject(sponsor.image);
          }
        }
      }
    }

    // 3. Process the template
    await fs.writeFile(
      path.join(tmpdir, "config.js"),
      `window.DECONF_CONFIG = JSON.parse('${safeJson(
        JSON.stringify(config)
      )}');`
    );

    const env = new nunjucks.Environment(new nunjucks.FileSystemLoader());
    const context = { ...config };

    env.addFilter("staticAsset", (file) => {
      console.debug("staticAsset path=%o", file);
      const url = new URL(path.join(s3Prefix, file), cdnUrl);
      return url.toString();
    });

    const templates = await globby(`${tmpdir}/**/*.njk`);
    for (const file of templates) {
      await fs.writeFile(file.replace(/\.njk$/, ""), env.render(file, context));
    }

    // 4. Bundle the app
    const bundler = new Parcel({
      entries: [path.join(tmpdir, "index.html")],
      defaultConfig: "@parcel/config-default",
      defaultTargetOptions: {
        distDir: "output/shallow",
        engines: {
          browsers: ["last 2 versions"],
        },
      },
      // mode: NODE_ENV,
    });

    await bundler.run();

    await fs.mkdir(path.join("output/shallow/assets"), { recursive: true });
    await exec(`cp -R ${tmpdir}/assets/ output/shallow/assets/`);

    if (process.argv.includes("--serve")) {
      const options = { public: "output/shallow" };
      const server = createServer((req, res) =>
        serveHandler(req, res, options)
      );
      server.listen(8080, () => console.log("Listening on :8080"));
    }
  } finally {
    if (!process.argv.includes("--keep")) {
      await exec(`rm -r ${tmpdir}`);
    }
  }
}

main();
