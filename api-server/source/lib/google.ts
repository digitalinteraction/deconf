import { Credentials, OAuth2Client } from "google-auth-library";
import { loader } from "gruber";
import { useAppConfig } from "./globals.ts";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export interface GoogleRepoOptions {
  clientId: string;
  clientSecret: string;
  redirectUrl: URL;
}

export class GoogleRepo {
  static use = loader(() => {
    const appConfig = useAppConfig();
    return new GoogleRepo({
      clientId: appConfig.google.oauth2.clientId,
      clientSecret: appConfig.google.oauth2.clientSecret,
      redirectUrl: new URL("./auth/v1/oauth/google", appConfig.server.url),
    });
  });

  options: GoogleRepoOptions;
  client: OAuth2Client;
  constructor(options: GoogleRepoOptions) {
    this.options = options;
    this.client = new OAuth2Client({
      client_id: options.clientId,
      client_secret: options.clientSecret,
      redirectUri: options.redirectUrl.toString(),
    });
  }

  createClient(tokens: Credentials) {
    const repo = new GoogleRepo(this.options);
    repo.client.setCredentials(tokens);
    return repo.client;
  }

  async getToken(code: string) {
    const res = await this.client.getToken(code);
    return res.tokens;
  }

  authUrl(scope: string[], state: string, requested = new Set<string>()) {
    return this.client.generateAuthUrl({
      access_type: requested.has("calendar") ? "offline" : undefined,
      scope,
      include_granted_scopes: true,
      state,
      prompt: "select_account",
    });
  }
}
