#!/usr/bin/env npx tsx

import process from "node:process";
import ms from "ms";
import { useTokens } from "../source/lib/mod.js";

const [subject, duration = "1h"] = process.argv.slice(2);

const usage = `
usage:
  ./scripts/dev_token.js <subject> [duration]

info:
  Signs a JWT to use for local API development.
  It will sign a development app token if no subject,
  or sign a user token if "subject" is provided
`;

if (process.argv.includes("--help") || !subject) {
  console.log(usage.trim());
  process.exit();
}

const tokens = useTokens();

const userId = parseInt(subject);
if (Number.isNaN(userId)) throw new Error("invalid id");

console.log(
  await tokens.sign("admin", {
    maxAge: ms(duration),
    userId,
  }),
);
