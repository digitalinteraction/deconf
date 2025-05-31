import { loader, RandomService, Store, TokenService, useRandom } from "gruber";

import { useStore, useTokens } from "./globals.ts";
import { useAppConfig } from "./globals.ts";
import cookie from "cookie";

export interface AuthnRequest<T> {
  token: string;
  payload: T;
  code: number;
}

export interface AuthenticationOptions {
  loginMaxAge: number;
  sessionMaxAge: number;
  cookieName: string;
  // allowedHosts: (string | URL)[];
}

// TODO: validate redirectUri ?

export class AuthenticationService<T> {
  static use = loader(() => {
    const appConfig = useAppConfig();
    return new AuthenticationService(useStore(), useRandom(), useTokens(), {
      ...appConfig.auth,
      // allowedHosts: [appConfig.server.url, appConfig.client.url],
    });
  });

  store: Store;
  random: RandomService;
  tokens: TokenService;
  options: AuthenticationOptions;
  constructor(
    store: Store,
    random: RandomService,
    tokens: TokenService,
    options: AuthenticationOptions,
  ) {
    this.store = store;
    this.random = random;
    this.tokens = tokens;
    this.options = options;
  }

  async get(
    token: string,
    code: string | number,
  ): Promise<AuthnRequest<T> | undefined> {
    const parsedCode =
      typeof code === "string" ? parseInt(code.replace(/\s+/, "")) : code;

    return this.store.get<AuthnRequest<T>>(
      `/authen/request/${token}-${parsedCode}`,
    );
  }

  async start(payload: T): Promise<{ token: string; code: number }> {
    const request: AuthnRequest<T> = {
      token: this.random.uuid(),
      code: this.random.number(0, 999_999),
      payload,
    };

    this.store.set(`/authn/request/${request.token}`, request, {
      maxAge: this.options.loginMaxAge * 1_000,
    });

    return request;
  }

  async finish(request: AuthnRequest<T>, userId: number) {
    const token = await this.tokens.sign("user", {
      maxAge: 30 * 24 * 60 * 60,
      userId,
    });

    const duration = Math.floor(this.options.sessionMaxAge / 1000);

    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
    const headers = new Headers({
      "Set-Cookie": cookie.serialize(this.options.cookieName, token, {
        maxAge: duration,
        path: "/",
        httpOnly: true,
      }),
      Location: request.redirectUri,
    });

    return {
      token,
      redirectUri: request.redirectUri,
      headers,
    };
  }
}
