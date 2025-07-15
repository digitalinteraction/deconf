import fs from "node:fs";
import process from "node:process";
import { getConfiguration, Infer, Structure } from "gruber";

import pkg from "../package.json" with { type: "json" };
import { DECONF_OOB } from "./lib/utilities.ts";
import { jwkStructure } from "./lib/mod.ts";

const config = getConfiguration();

const struct = config.object({
  env: config.string({
    variable: "NODE_ENV",
    flag: "--env",
    fallback: "development",
  }),

  meta: config.object({
    name: config.string({ variable: "APP_NAME", fallback: pkg.name }),
    version: config.string({ variable: "APP_VERSION", fallback: pkg.version }),
  }),

  server: config.object({
    port: config.number({ variable: "PORT", flag: "--port", fallback: 3000 }),
    hostname: config.string({
      variable: "HOST",
      flag: "--hostname",
      fallback: "0.0.0.0",
    }),
    url: config.url({
      variable: "SELF_URL",
      flag: "--url",
      fallback: "http://localhost:3000",
    }),
  }),

  // client: config.object({
  //   url: config.url({
  //     variable: "CLIENT_URL",
  //     fallback: "http://localhost:8080",
  //   }),
  // }),

  postgres: config.object({
    url: config.url({
      variable: "POSTGRES_URL",
      fallback: "postgres://user:secret@localhost:5432/user",
    }),
  }),

  redis: config.object({
    prefix: config.string({ variable: "REDIS_PREFIX", fallback: "" }),
    url: config.url({
      variable: "REDIS_URL",
      fallback: "redis://localhost:6379",
    }),
  }),

  auth: config.object({
    loginCookie: config.string({
      variable: "AUTH_LOGIN_COOKIE",
      fallback: "deconf_login",
    }),
    loginMaxAge: config.number({
      variable: "AUTH_SESSION_MAX_AGE",
      fallback: 15 * 60 * 1_000, // 15 minutes
    }),

    sessionCookie: config.string({
      variable: "AUTH_SESSION_COOKIE",
      fallback: "deconf_session",
    }),
    sessionMaxAge: config.number({
      variable: "AUTH_SESSION_MAX_AGE",
      fallback: 30 * 24 * 60 * 60 * 1_000, // 30 days
    }),

    // appName: config.string({
    //   variable: "AUTH_APP_NAME",
    //   fallback: "Deconf",
    // }),
  }),

  jwt: config.object({
    issuer: config.string({
      variable: "JWT_ISSUER",
      fallback: "deconf.app",
    }),
    audience: config.string({
      variable: "JWT_AUDIENCE",
      fallback: "deconf.app",
    }),
    key: config.external(
      new URL("../jwk.json", import.meta.url),
      jwkStructure(),
    ),
  }),

  email: config.object({
    endpoint: config.url({
      variable: "EMAIL_ENDPOINT",
      fallback: DECONF_OOB,
    }),
    apiKey: config.string({ variable: "EMAIL_API_KEY", fallback: "" }),
  }),

  webPush: config.object({
    credentials: config.external(
      new URL("../web-push-credentials.json", import.meta.url),
      Structure.object({
        publicKey: Structure.string(""),
        privateKey: Structure.string(""),
      }),
    ),
  }),
});

export async function loadConfig(path: string | URL) {
  if (fs.existsSync(".env")) process.loadEnvFile(".env");

  const value = await config.load(path, struct);

  if (value.env === "production") {
    // if (value.sendgrid.apiKey === "") {
    //   throw new Error("sendgrid.apiKey not set");
    // }
    // if (value.sendgrid.templateId === "") {
    //   throw new Error("sendgrid.templateId not set");
    // }
    if (value.webPush.credentials.privateKey === "") {
      throw new Error("[config] webPush.credentials.privateKey not set");
    }
    if (value.webPush.credentials.publicKey === "") {
      throw new Error("[config] webPush.credentials.publicKey not set");
    }
    if (value.email.endpoint.toString() === DECONF_OOB) {
      throw new Error("[config] email.endpoint not set");
    }
    if (value.email.apiKey === "") {
      throw new Error("[config] email.apiKey not set");
    }
  } else {
    // if (Object.keys(value.jwt.key).length === 0) {
    //   console.log("Generating development JWKS");
    //   value.jwt.key = await generateJwk();
    // }
  }

  return value;
}

export type AppConfig = Infer<typeof struct>;

export function dumpConfiguration() {
  console.log(config.getUsage(struct, _appConfig));
}

// Secret value to auto-pare + make available through a dependency
export const _appConfig = await loadConfig(
  new URL("../config.json", import.meta.url),
);
