import {
  AbstractAuthorizationService,
  AuthorizationService,
  Cors,
  loader as defineDependency,
  getTerminator,
  SqlDependency,
  Store,
  TokenService,
  useRandom,
} from "gruber";
import postgres from "postgres";

export { default as createDebug } from "debug";

import { _appConfig } from "../config.js";
import { CSRF } from "./csrf.js";
import {
  DebugEmailService,
  EmailService,
  ExternalEmailService,
} from "./email.ts";
import { JoseJWKTokens } from "./gruber-hacks.ts";
import { NodeRedisStore } from "./store.ts";
import { DECONF_OOB } from "./utilities.ts";

export const useAppConfig = defineDependency(() => {
  return _appConfig;
});

export const useDatabase = defineDependency<SqlDependency>(
  () => postgres(_appConfig.postgres.url.toString()) as SqlDependency,
);

export const useTerminator = defineDependency(() => {
  const appConfig = useAppConfig();
  return getTerminator({
    timeout: appConfig.env === "development" ? 0 : 5_000,
  });
});

export const useCors = defineDependency(() => {
  const appConfig = useAppConfig();
  return appConfig.env === "development"
    ? new Cors({
        origins: ["*"],
        credentials: true,
      })
    : undefined;
});

export const useStore = defineDependency((): Store => {
  const appConfig = useAppConfig();
  return new NodeRedisStore(appConfig.redis.url, appConfig.redis);
});

export const useCSRF = defineDependency(() => {
  return new CSRF(useStore());
});

export const useTokens = defineDependency<TokenService>(() => {
  const appConfig = useAppConfig();
  return new JoseJWKTokens(appConfig.jwt);
});

export const useAuthz = defineDependency<AbstractAuthorizationService>(() => {
  const appConfig = useAppConfig();
  return new AuthorizationService(
    { cookieName: appConfig.auth.sessionCookie },
    useTokens(),
  );
});

export const useEmail = defineDependency<EmailService>(() => {
  const appConfig = useAppConfig();
  return appConfig.email.endpoint.href !== DECONF_OOB
    ? new ExternalEmailService(appConfig.email, appConfig)
    : new DebugEmailService();
});

export const commponDependencies = {
  appConfig: useAppConfig,
  sql: useDatabase,
  terminator: useTerminator,
  cors: useCors,
  store: useStore,
  csrf: useCSRF,
  tokens: useTokens,
  authz: useAuthz,
  email: useEmail,
  random: useRandom,
};
