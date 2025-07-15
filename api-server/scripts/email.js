#!/usr/bin/env npx tsx

import process from "node:process";
import { useEmail } from "../source/lib/mod.js";

const [emailAddress, kind = "test"] = process.argv.slice(2);

const usage = `
usage:
  ./scripts/email.js <emailAddress> [kind]

arguments:
  <emailAddress>  who to send the email to
  [kind=test]     the type of email to sent, choices: "login" or "test"

info:
  Send a test email using the configured endpoint
`;

if (process.argv.includes("--help") || !emailAddress) {
  console.log(usage.trim());
  process.exit();
}

const email = useEmail();

if (kind === "login") {
  const success = await email.sendTemplated({
    to: { emailAddress },
    type: "login",
    arguments: {
      oneTimeCode: 1234,
      magicLink: "https://example.com?code=123456",
    },
  });

  console.log("login success=%0", success);
} else {
  const success = await email.sendPlain({
    to: { emailAddress },
    subject: "Test email",
    body: "Nothing to see here, this is just a test.",
  });

  console.log("test success=%0", success);
}
