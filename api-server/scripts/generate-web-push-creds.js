#!/usr/bin/env npx tsx

import process from "node:process";
import webPush from "web-push";

// NOTE: this imports utilites so it doesn't load in "config"
import { generateJwk } from "../source/lib/utilities.ts";

const usage = `
usage:
  ./scripts/generate-web-push-creds.js

info:
  Generate a JSON file with vapid credentials for Web Push notifications
`;

if (process.argv.includes("--help")) {
  console.log(usage.trim());
  process.exit();
}

console.log(JSON.stringify(webPush.generateVAPIDKeys(), null, 2));
