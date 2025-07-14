#!/usr/bin/env npx tsx

import process from "node:process";

// NOTE: this imports utilites so it doesn't load in "config"
import { generateJwk } from "../source/lib/utilities.ts";

const [kid] = process.argv.slice(2);

const usage = `
usage:
  ./scripts/generate-jwk.js <kid>

info:
  Generate a JSON Web Key for signing JWTs

arguments:
  <kid>   an identifier for the key 
`;

if (process.argv.includes("--help") || !kid) {
  console.log(usage.trim());
  process.exit();
}

console.log(JSON.stringify(await generateJwk(kid), null, 2));
