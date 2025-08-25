#!/usr/bin/env npx tsx

import process from "node:process";
import cp from "node:child_process";
import { promisify } from "node:util";
import pkg from "../package.json" with { type: "json" };

const exec = promisify(cp.exec);

const [version] = process.argv.slice(2);

const usage = `
usage:
  ./scripts/version.js <version>

info:
  Cut a release of the server, build the docker and push it.

current: ${pkg.version}
`;

if (process.argv.includes("--help") || !version) {
  console.log(usage.trim());
  process.exit();
}

const cwd = new URL("../", import.meta.url);

console.log("version %o", version);
await exec(`npm version --allow-same-version ${version}`, { cwd });

// const tag = `containers.r0b.io/deconf/api-server:${version}`;

// console.log("build %o", tag);
// await exec(`docker build -t ${tag} --platform=linux/arm64,linux/amd64 .`, {
//   cwd,
// });

// console.log("pushing");
// await exec(`docker push ${tag}`, { cwd });

const tag = `api-server/v${version}`;

console.log("staging");
await exec("git add package.json package-lock.json");

console.log("committing");
await exec(`git commit -m "${tag}"`);

console.log("tagging");
await exec(`git tag -m "${tag}" "${tag}"`);

console.log("done");
