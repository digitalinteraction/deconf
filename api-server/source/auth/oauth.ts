import { assertRequestBody, defineRoute, HTTPError, Structure } from "gruber";
import {
  commponDependencies,
  GOOGLE_CALENDAR_SCOPE,
  GoogleRepo,
  trimEmail,
} from "../lib/mod.ts";
import { AuthLib, LoginRequest, parseScopes } from "./auth-lib.ts";
import { AuthRepo } from "./auth-repo.ts";

// An error that is shown to the user via a HTTP redirect to a page that renders it
// by accessing the ?error URL search parameter
class RedirectedError extends HTTPError {
  url: URL;
  errorCode: string;
  constructor(url: URL | string, code: string) {
    super(200);
    this.url = new URL(url);
    this.errorCode = code;
  }

  override toResponse(): Response {
    const url = new URL(this.url);
    url.searchParams.set("error", this.errorCode);
    return Response.redirect(url);
  }
}

export const oauthRoute = defineRoute({
  method: "GET",
  pathname: "/auth/v1/oauth/:provider",
  dependencies: {
    ...commponDependencies,
    repo: AuthRepo.use,
    lib: AuthLib.use,
    google: GoogleRepo.use,
  },
  async handler({ url, store, repo, lib, google, params }) {
    const body = await assertRequestBody(Structure.any(), url.searchParams);

    // If there was a oauth error, stop now
    if (typeof body.error === "string") {
      console.error("[oauth2 error]", body);
      throw new HTTPError(400, undefined, "Something went wrong");
    }

    // Get the code and state from the URL
    if (
      params.provider === "google" &&
      typeof body.code === "string" &&
      typeof body.state === "string"
    ) {
      const login = await store.get<LoginRequest>(
        `/auth/request/${body.state}`,
      );
      if (login?.method !== "oauth") {
        throw new HTTPError(400, undefined, "Something went wrong");
      }

      //
      // Prove their google login
      //

      const token = await google.getToken(body.code);

      const client = google.createClient(token);
      const verified = await client.verifyIdToken({
        idToken: token.id_token!,
      });
      const profile = verified.getPayload();
      if (!profile?.email) {
        throw new RedirectedError(login.redirectUri, "oauth2_failed");
      }

      //
      // Check they exist within deconf
      //

      const user = await repo.getUserByEmail(trimEmail(profile.email));

      if (!user) {
        throw new RedirectedError(login.redirectUri, "unknown_email");
      }

      // Store the user's oauth2 credentials if they have the calander scope
      if (token.scope && parseScopes(token.scope).has(GOOGLE_CALENDAR_SCOPE)) {
        await repo.createToken({
          user_id: user.id,
          kind: "google",
          scope: token.scope ?? "",
          access_token: token.access_token!,
          refresh_token: token.refresh_token ?? null,
          expires_at: token.expiry_date ? new Date(token.expiry_date) : null,
        });
      }

      const scope = user.metadata.admin ? "admin" : "user";
      const { headers, sessionToken } = await lib.finish(login, user.id, scope);

      // Generate a link back to the app with their session info
      // a similar format to the magicLink
      const link = new URL(login.redirectUri);
      link.searchParams.set("method", "oauth");
      link.searchParams.set("token", sessionToken);
      headers.set("location", link.toString());

      return new Response(undefined, { headers, status: 302 });
    }

    throw HTTPError.notImplemented();
  },
});
