#!/usr/bin/env node

import path from "path";
import fs from "fs/promises";
import cp from "child_process";
import crypto from "crypto";

/** @param {Buffer} data */
function blob(data) {
  const sha = crypto.createHash("sha256").update(data).digest("hex");
  return {
    data,
    hashAlgorithm: "sha256",
    sha: crypto.createHash("sha256").update(data).digest("hex"),
    digest: `sha256:${sha}`,
    size: data.byteLength,
  };
}
function jsonBuffer(input) {
  // Pretty-print JSON for the purpose of this demo
  return Buffer.from(JSON.stringify(input, null, 2));
}
function descriptor(mediaType, blob) {
  // https://github.com/opencontainers/image-spec/blob/main/descriptor.md#properties
  return {
    mediaType,
    size: blob.size,
    digest: blob.digest,
  };
}

//
// Script entry point
//
async function main() {
  // Get the version argument or exit early
  const [version] = process.argv.slice(2);
  if (!version) throw new Error("No version specified");

  const stat = await fs.stat(version).catch(() => null);
  if (stat) throw new Error("Already exists");

  const app = blob(cp.execSync("tar -c app | gzip --no-name"));

  // Custom config type? not sure if this is compliant
  const config = blob(
    jsonBuffer({
      mediaType: "application/vnd.alembic.app.config.v1+json",
      rootDir: "app",
    })
  );

  // https://github.com/opencontainers/image-spec/blob/main/manifest.md
  const manifest = blob(
    jsonBuffer({
      schemaVersion: 2,
      mediaType: "application/vnd.oci.image.manifest.v1+json",
      config: descriptor("application/vnd.alembic.app.config.v1+json", config),
      layers: [descriptor("application/vnd.oci.image.layer.v1.tar+gzip", app)],
      annotations: {
        "dev.openlab.deconf": "0.1",
        "org.opencontainers.image.ref.name": version,
      },
    })
  );

  const blobs = [app, config, manifest];
  for (const blob of blobs) {
    const file = path.join(
      "images",
      version,
      "blobs",
      blob.hashAlgorithm,
      blob.sha
    );
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, blob.data);
  }

  // https://github.com/opencontainers/image-spec/blob/main/image-index.md
  const index = jsonBuffer({
    schemaVersion: 2,
    mediaType: "application/vnd.oci.image.index.v1+json",
    manifests: [
      descriptor("application/vnd.oci.image.manifest.v1+json", manifest),
    ],
  });

  // https://github.com/opencontainers/image-spec/blob/main/image-layout.md
  const ociLayout = jsonBuffer({
    imageLayoutVersion: "1.0.0",
  });

  await fs.writeFile(path.join("images", version, "index.json"), index);
  await fs.writeFile(path.join("images", version, "oci-layout"), ociLayout);
}

main();
