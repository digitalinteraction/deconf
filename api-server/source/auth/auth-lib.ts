import cookie from "cookie";
import { HTTPError, loader, Store, TokenService } from "gruber";
import { AppConfig } from "../config.ts";
import {
  EmailService,
  useAppConfig,
  useEmail,
  useStore,
  useTokens,
} from "../lib/mod.ts";

export interface EmailLoginRequest {
  method: "email";
  token: string;
  payload: {
    emailAddress: string;
  };
  code: number;
  redirectUri: string;
  uses: number;
}

export interface OauthLoginRequest {
  method: "oauth";
  provider: "google";
  token: string;
  redirectUri: string;
}

export type LoginRequest = EmailLoginRequest | OauthLoginRequest;

export class AuthLib {
  static use = loader(() => {
    return new AuthLib(useTokens(), useAppConfig(), useStore(), useEmail());
  });

  appConfig: AppConfig;
  tokens: TokenService;
  store: Store;
  email: EmailService;
  constructor(
    tokens: TokenService,
    appConfig: AppConfig,
    store: Store,
    email: EmailService,
  ) {
    this.tokens = tokens;
    this.appConfig = appConfig;
    this.store = store;
    this.email = email;
  }

  async startEmailLogin(init: EmailLoginRequest) {
    // Store the login to be retrieved on clicking through from the email
    this.store.set<LoginRequest>(`/auth/request/${init.token}`, init, {
      maxAge: this.appConfig.auth.loginMaxAge,
    });

    // Generate the magic link to send the client with the token + code in it
    const magicLink = new URL(init.redirectUri);
    magicLink.searchParams.set("method", "email");
    magicLink.searchParams.set("token", init.token);
    magicLink.searchParams.set("code", init.code.toString());

    // Send the email
    const sent = await this.email.sendTemplated({
      to: { emailAddress: init.payload.emailAddress },
      type: "login",
      arguments: {
        oneTimeCode: init.code,
        magicLink: magicLink.toString(),
      },
    });

    if (!sent) {
      throw HTTPError.internalServerError("login email failed");
    }
  }

  async finish(login: LoginRequest, userId: number, scope: string) {
    // Generate a session token for the user
    const sessionToken = await this.tokens.sign(scope, {
      maxAge: this.appConfig.auth.sessionMaxAge,
      userId: userId,
    });

    // Generate headers to set the session token and clear the login token
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      cookie.serialize(this.appConfig.auth.sessionCookie, sessionToken, {
        httpOnly: true,
        maxAge: this.appConfig.auth.sessionMaxAge / 1_000,
        secure: this.appConfig.server.url.protocol === "https:",
      }),
    );
    headers.append(
      "Set-Cookie",
      cookie.serialize(this.appConfig.auth.loginCookie, "", {
        expires: new Date(0),
      }),
    );

    // Clear the login from the store
    await this.store.delete(`/auth/request/${login.token}`);

    return { headers, sessionToken };
  }
}

export function parseScopes(input: string) {
  return new Set(input.split(/\s+/).filter((s) => s));
}
