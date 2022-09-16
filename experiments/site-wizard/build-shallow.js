#!/usr/bin/env node

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

import { getConfig } from "./config.js";

const { NODE_ENV = "production" } = process.env;
const exec = promisify(cp.exec);

/** @param {string} input */
function safeJson(input) {
  return input.replaceAll(/'/g, "\\'").replaceAll(/\\n/g, "\\\\n");
}

// TODO:
// - fontawesome stuff
// - embed SVG icons
// - work out how to do assets from CDN/uploads

async function main() {
  const deploymentUrl = new URL("https://v1.dog-conf.deconf.app");
  const cdnUrl = new URL(
    "https://deconf-labs.ams3.cdn.digitaloceanspaces.com/site-wizard/shallow/"
  );

  const config = await getConfig();
  config.site.url = deploymentUrl.toString();

  // 1. Clone the template
  const tmpdir = await fs.mkdtemp("shallow_");
  await fs.mkdir(tmpdir, { recursive: true });
  await exec(`cp -R template/shallow/* ${tmpdir}`);

  // 2. Prep assets
  // for (const script of config.site.customScripts) {
  //   // const url = new URL(script, cdnUrl);
  //   // console.log(url.toString());
  //   // console.log(path.join(process.cwd(), script));
  // }

  // 3. Process the template
  await fs.writeFile(
    path.join(tmpdir, "config.js"),
    `window.DECONF_CONFIG = JSON.parse('${safeJson(JSON.stringify(config))}');`
  );
  for (const file of await globby(`${tmpdir}/**/*.njk`)) {
    if (file.endsWith("config.js")) continue;
    await fs.writeFile(
      file.replace(/\.njk$/, ""),
      nunjucks.render(file, config)
    );
  }

  // 4. Bundle the app
  const bundler = new Parcel({
    entries: [path.join(tmpdir, "index.html")],
    defaultConfig: "@parcel/config-default",
    defaultTargetOptions: {
      distDir: "dist/shallow",
      engines: {
        browsers: ["last 2 versions"],
      },
    },
    // mode: NODE_ENV,
  });

  await bundler.run();

  if (process.argv.includes("--serve")) {
    const options = { public: "dist/shallow" };
    const server = createServer((req, res) => serveHandler(req, res, options));
    server.listen(8080, () => console.log("Listening on :8080"));
  }

  await exec(`rm -r ${tmpdir}`);
}

main();
