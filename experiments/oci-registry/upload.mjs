#!/usr/bin/env node

import path from "path";
import fs from "fs/promises";
import got from "got";
import { globby } from "globby";

const REGISTRY = "http://localhost:5000";
const APP = "my-app";
// const APP = "my/other/app";

//
// Script entry point
//
async function main() {
  // Grab the version argument or fail now
  const [version] = process.argv.slice(2);
  if (!version) throw new Error("No version specified");

  // Loop through all the blobs for that image
  console.debug("Pushing blobs");
  for (const blobPath of await globby(`images/${version}/blobs/*/*`)) {
    const [alg, hash] = blobPath.split(path.sep).slice(-2);
    const digest = `${alg}:${hash}`;

    // Skip the blob if it already exists in the registry
    const head = await got.head(`${REGISTRY}/v2/${APP}/blobs/${digest}`, {
      throwHttpErrors: false,
    });
    if (head.ok) {
      console.log("skipping %o", digest);
      continue;
    }

    // Upload the blob
    const post = await got.post(`${REGISTRY}/v2/${APP}/blobs/uploads`);
    const location = new URL(post.headers.location);
    location.searchParams.set("digest", digest);

    // TODO: it could stream fs to http?
    console.log("uploading %o", digest);
    await got
      .put(location.toString(), { body: await fs.readFile(blobPath) })
      .json();
  }

  // Skip the manifest if it already exists in the regsitry
  const manifestHead = await got.head(
    `${REGISTRY}/v2/${APP}/manifests/${version}`,
    {
      throwHttpErrors: false,
      headers: { accept: "application/vnd.oci.image.index.v1+json" },
    }
  );
  if (manifestHead.ok) {
    console.log("skipping manifest");
    return;
  }

  console.debug("uploading manifest");
  const manifest = await got
    .put(`${REGISTRY}/v2/${APP}/manifests/${version}`, {
      body: await fs.readFile(`images/${version}/index.json`),
      headers: {
        "Content-Type": "application/vnd.oci.image.index.v1+json",
      },
    })
    .json();

  console.log(manifest);
}

main();
