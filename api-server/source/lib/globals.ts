import {
  AbstractAuthorizationService,
  AuthorizationService,
  Cors,
  getTerminator,
  JoseTokens,
  loader as defineDependency,
  RedisStore,
  Store,
  TokenService,
  useRandom,
  SqlDependency,
} from "gruber";
import postgres from "postgres";
import * as redis from "redis";
import * as jose from "jose";
import * as Minio from "minio";

export { default as createDebug } from "debug";

import { _appConfig, loadConfig } from "../config.js";
import { CSRF } from "./csrf.js";
import { EmailService, SendgridService } from "./email.ts";
import { AuthenticationService } from "./authentication.ts";
import { DeconfAuthen } from "./types.ts";

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
        origins: [appConfig.client.url.origin],
        credentials: true,
      })
    : undefined;
});

export const useStore = defineDependency((): Store => {
  const appConfig = useAppConfig();
  const client = redis.createClient({
    url: appConfig.redis.url.toString(),
  });
  return new RedisStore(client, appConfig.redis);
});

export const useCSRF = defineDependency(() => {
  return new CSRF(useStore());
});

export const useTokens = defineDependency<TokenService>(() => {
  const appConfig = useAppConfig();
  return new JoseTokens(appConfig.jwt, jose as any);
});

export const useAuthz = defineDependency<AbstractAuthorizationService>(() => {
  const appConfig = useAppConfig();
  return new AuthorizationService(appConfig.auth, useTokens());
});

export const useEmail = defineDependency<EmailService>(() => {
  return new SendgridService(useAppConfig().sendgrid);
});

export const useAuthen = defineDependency(() => {
  return new AuthenticationService<DeconfAuthen>(
    useStore(),
    useRandom(),
    useTokens(),
    useAppConfig().auth,
  );
});
