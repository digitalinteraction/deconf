#!/usr/bin/env npx tsx

import process from "node:process";
import * as jose from "jose";

const [kid] = process.argv.slice(2);

const usage = `
usage:
  ./scripts/generate-jwk.ts <kid>

info:
  Generate a JSON Web Key for signing JWTs
`;

if (process.argv.includes("--help") || !kid) {
  console.log(usage.trim());
  process.exit();
}

const { privateKey } = await jose.generateKeyPair("RS256", {
  extractable: true,
});

const privateJwk = await jose.exportJWK(privateKey);
privateJwk.alg = "RS256";
privateJwk.use = "sig";
privateJwk.kid = kid;

console.log(JSON.stringify(privateJwk, null, 2));
