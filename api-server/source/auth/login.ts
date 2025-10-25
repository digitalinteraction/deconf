import cookie from "cookie";
import { assertRequestBody, defineRoute, HTTPError, Structure } from "gruber";

import {
  commponDependencies,
  ConferenceRecord,
  emailStructure,
  GOOGLE_CALENDAR_SCOPE,
  GoogleRepo,
  trimEmail,
  undefinedStructure,
} from "../lib/mod.ts";
import { AuthLib, LoginRequest, parseScopes } from "./auth-lib.ts";
import { AuthRepo } from "./auth-repo.ts";

const LoginBody = Structure.union([
  Structure.object({
    type: Structure.literal("email"),
    emailAddress: emailStructure(),
    redirectUri: Structure.string(),
    conferenceId: Structure.union([Structure.null(), Structure.number()]),
  }),
  Structure.object({
    type: Structure.literal("oauth"),
    provider: Structure.literal("google"),
    redirectUri: Structure.string(),
    conferenceId: Structure.union([Structure.null(), Structure.number()]),
    scope: Structure.union([Structure.string(), undefinedStructure()]),
  }),
]);

function stripRedirect(input: string) {
  const url = new URL(input);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function assertRedirect(input: string, conference: ConferenceRecord | null) {
  const uri = stripRedirect(input);

  if (conference && Array.isArray(conference.metadata.redirect_uris)) {
    if (conference.metadata.redirect_uris.includes(uri)) return;
  }

  // NOTE: there could be allowed non-conference URIs in the future
  throw HTTPError.badRequest("invalid redirect_uri");
}

export const loginRoute = defineRoute({
  method: "POST",
  pathname: "/auth/v1/login",
  dependencies: {
    ...commponDependencies,
    repo: AuthRepo.use,
    lib: AuthLib.use,
    google: GoogleRepo.use,
  },
  async handler({ request, store, random, lib, appConfig, repo, google }) {
    // NOTE: it previously short-circuited the login if there was an active session
    // this cased confusion so was taken out

    const body = await assertRequestBody(LoginBody, request);

    const conference = body.conferenceId
      ? await repo.getConference(body.conferenceId)
      : null;

    assertRedirect(body.redirectUri, conference);

    const login = {
      token: random.uuid(),
      code: random.number(0, 999_999),
      redirectUri: body.redirectUri,
      uses: 5,
    };

    const cookieOptions = {
      httpOnly: true,
      maxAge: appConfig.auth.loginMaxAge / 1_000,
      secure: appConfig.server.url.protocol === "https:",
    };

    if (body.type === "email") {
      const emailAddress = trimEmail(body.emailAddress);

      // TODO: should it verify conference registration too?
      const user = await repo.getUserByEmail(emailAddress);
      if (!user) throw HTTPError.unauthorized();

      // Send the email login, throwing if it fails
      await lib.startEmailLogin({
        ...login,
        method: "email",
        payload: { emailAddress },
      });

      // Set the login cookie on the client
      const headers = new Headers();
      headers.set(
        "Set-Cookie",
        cookie.serialize(appConfig.auth.loginCookie, login.token, {
          ...cookieOptions,
        }),
      );

      // NOTE: just-cookies doesn't work on safari,
      // maybe an oauth2 flow would be better in the futures
      return Response.json({ token: login.token }, { headers });
    }

    if (body.type === "oauth") {
      const scope = [
        "https://www.googleapis.com/auth/userinfo.email",
        "openid",
        "profile",
      ];

      const requested = body.scope
        ? parseScopes(body.scope)
        : new Set<string>();

      if (requested.has("calendar")) {
        scope.push(GOOGLE_CALENDAR_SCOPE);
      }

      await store.set<LoginRequest>(`/auth/request/${login.token}`, {
        ...login,
        method: "oauth",
        provider: "google",
      });

      const headers = new Headers();
      headers.set(
        "Set-Cookie",
        cookie.serialize("oauth2-state", login.token, cookieOptions),
      );

      const url = google.authUrl(scope, login.token, requested);

      // NOTE: you cannot access headers.location from JavaScript
      // This method would make more sense as a GET request, then cookies can be set too
      return Response.json({ location: url }, { headers });
    }

    throw HTTPError.notImplemented();
  },
});
