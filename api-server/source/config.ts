import { getConfiguration, Infer, Structure } from "gruber";
import pkg from "../package.json" with { type: "json" };
import { useAppConfig } from "./lib/globals.js";

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

  client: config.object({
    url: config.url({
      variable: "CLIENT_URL",
      fallback: "http://localhost:8080",
    }),
  }),

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
    loginMaxAge: config.number({
      variable: "AUTH_SESSION_MAX_AGE",
      fallback: 30 * 60 * 1_000, // 30 minutes
    }),
    sessionMaxAge: config.number({
      variable: "AUTH_SESSION_MAX_AGE",
      fallback: 30 * 24 * 60 * 60 * 1_000, // 30 days
    }),
    cookieName: config.string({
      variable: "AUTH_COOKIE_NAME",
      fallback: "deconf-api-server",
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
    secret: config.string({ variable: "JWT_SECRET", fallback: "not_secret" }),
    // secret: configFile(config, import.meta.resolve("../resources/token.pem"), {
    //   variable: "JWT_SECRET",
    //   fallback: "not_secret",
    // }),
  }),

  // sendgrid: config.object({
  //   apiKey: config.string({ variable: "SENDGRID_API_TOKEN", fallback: "" }),
  //   fromAddress: config.string({
  //     variable: "EMAIL_FROM_ADDRESS",
  //     fallback: "noreply@openlab.dev",
  //   }),
  //   fromName: config.string({
  //     variable: "EMAIL_FROM_NAME",
  //     fallback: "Deconf",
  //   }),
  //   templateId: config.string({
  //     variable: "SENDGRID_TEMPLATE_ID",
  //     fallback: "",
  //   }),
  //   endpoint: config.string({
  //     variable: "SENDGRID_ENDPOINT",
  //     fallback: "https://api.sendgrid.com",
  //   }),
  // }),

  email: config.object({
    endpoint: config.url({
      variable: "EMAIL_ENDPOINT",
      fallback: "deconf://oob",
    }),
    apiKey: config.string({ variable: "EMAIL_API_KEY", fallback: "" }),
  }),

  webPush: config.object({
    credentials: config.external(
      import.meta.resolve("../web-push-credentials.json"),
      Structure.object({
        publicKey: Structure.string(""),
        privateKey: Structure.string(""),
      }),
    ),
  }),
});

export async function loadConfig(path: string | URL) {
  const value = await config.load(path, struct);

  if (value.env === "production") {
    // if (value.sendgrid.apiKey === "") {
    //   throw new Error("sendgrid.apiKey not set");
    // }
    // if (value.sendgrid.templateId === "") {
    //   throw new Error("sendgrid.templateId not set");
    // }
    if (value.webPush.credentials.privateKey === "") {
      throw new Error("webPush.credentials.privateKey not set");
    }
    if (value.webPush.credentials.publicKey === "") {
      throw new Error("webPush.credentials.publicKey not set");
    }
    if (value.jwt.secret === "") {
      throw new Error("jwt.secret not set");
    }
    if (value.email.endpoint.toString() === "deconf://oob") {
      throw new Error("email.endpoint not set");
    }
  }

  return value;
}

export type AppConfig = Infer<typeof struct>;

export function dumpConfig() {
  console.log(config.getUsage(struct, useAppConfig()));
}

// Secret value to auto-pare + make available through a dependency
export const _appConfig = await loadConfig(
  import.meta.resolve("../config.json"),
);
