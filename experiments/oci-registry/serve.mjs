#!/usr/bin/env node

import path from "path";
import got from "got";
import { createServer } from "http";

import tar from "tar";
import stream from "stream/promises";

const APP_PORT = 8080;
const REGISTRY = "http://localhost:5000";
const memfs = new Map();
const pulled = new Set();

// TODO: more mime types:
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
const extmap = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
};

//
// Script entry point
//
async function main() {
  setInterval(() => tick(), 10_000);
  await tick();

  // A http server that serves the memfs files with an index.html fallback
  // and sets the content-type based on the extension of the virtual file
  const server = createServer((req, res) => {
    if (req.method === "GET") {
      const toTry = [req.url];
      if (!path.extname(req.url)) {
        toTry.push(path.join(req.url, "index.html"));

        // Redirect requests without a trailing slash OR file extension
        if (!req.url.endsWith("/")) {
          res.setHeader("Location", req.url + "/");
          res.statusCode = 302;
          res.end("Redirecting...");
          return;
        }
      }

      console.log("GET %s", req.url, toTry);

      for (const file of toTry) {
        if (!memfs.has(file)) continue;

        res.setHeader(
          "Content-Type",
          extmap[path.extname(file)] ?? "text/plain"
        );

        res.end(memfs.get(file));
        return;
      }

      if (req.url === "/") {
        res.end("ok");
        return;
      }
    }

    res.statusCode = 404;
    res.end("Not found");
  });

  server.listen(APP_PORT, () => {
    console.log("Listening on :" + APP_PORT);
  });
}

/** Query the registry, download static sites and untar into the memory fs */
async function tick() {
  // Grab all repos
  const repos = await got(`${REGISTRY}/v2/_catalog`).json();

  for (const repo of repos.repositories) {
    // Grab all refs from a repo
    const refs = await got(`${REGISTRY}/v2/${repo}/tags/list`).json();

    for (const tag of refs.tags) {
      const fullTag = path.join(repo, tag);
      if (pulled.has(fullTag)) continue;

      // Get the container index.json
      const index = await got(`${REGISTRY}/v2/${repo}/manifests/${tag}`, {
        headers: { accept: "application/vnd.oci.image.index.v1+json" },
      }).json();

      // Get the digest of the manifest file
      // This implementation only supports a root-level index, not manifest
      const manifestDigest = index.manifests.find(
        (m) => m.mediaType === "application/vnd.oci.image.manifest.v1+json"
      )?.digest;

      if (!manifestDigest) {
        console.error("Bad index.json %o:%o", repo, tag);
        continue;
      }

      // Get the container manifest from the blobs
      // TODO: There could be a key in the config that points to the layer to use?
      const manifest = await got(
        `${REGISTRY}/v2/${repo}/blobs/${manifestDigest}`
      ).json();

      // Find the tar digest
      const tarDigest = manifest.layers.find(
        (l) => l.mediaType === "application/vnd.oci.image.layer.v1.tar+gzip"
      )?.digest;

      if (!tarDigest) {
        console.error("Bad layers %o:%o", repo, tag);
        continue;
      }

      // TODO: get config and remove the app/ bit better

      // Stream the blob into an untar process that than loads the files into memory
      await stream.pipeline(
        got.stream(`${REGISTRY}/v2/${repo}/blobs/${tarDigest}`),

        // https://github.com/npm/node-tar/issues/181#issuecomment-1193909892
        new tar.Parse({
          filter: (path, entry) => entry.type === "File",
          onentry: async (entry) => {
            const chunks = [];
            for await (const data of entry) chunks.push(data);
            const buffer = Buffer.concat(chunks);

            const name = path.join(
              "/",
              repo,
              tag,
              entry.path.replace("app/", "")
            );
            memfs.set(name, buffer);
            console.log("cache %o", name);
          },
        })
      );

      // Remember we pulled this app/tag combo
      pulled.add(fullTag);
    }
  }
}

main();
