import cookie from "cookie";
import {
  assertRequestBody,
  defineRoute,
  HTTPError,
  Store,
  Structure,
} from "gruber";

import {
  commponDependencies,
  ConferenceRecord,
  EmailService,
  emailStructure,
  trimEmail,
} from "../lib/mod.ts";
import { LoginRequest } from "./auth-lib.ts";
import { AuthRepo } from "./auth-repo.ts";

const LoginBody = Structure.union([
  Structure.object({
    emailAddress: emailStructure(),
    redirectUri: Structure.string(),
    conferenceId: Structure.union([Structure.null(), Structure.number()]),
  }),
]);

// This is exported so that it can be used in the tito webhook too
export async function _startEmailLogin(
  store: Store,
  email: EmailService,
  login: Omit<LoginRequest, "method" | "payload">,
  emailAddress: string,
  maxAge: number,
) {
  // Store the login to be retrieved on clicking through from the email
  store.set<LoginRequest>(
    `/auth/request/${login.token}`,
    {
      ...login,
      method: "email",
      payload: { emailAddress },
    },
    { maxAge },
  );

  // Generate the magic link to send the client with the token + code in it
  const magicLink = new URL(login.redirectUri);
  magicLink.searchParams.set("method", "email");
  magicLink.searchParams.set("token", login.token);
  magicLink.searchParams.set("code", login.code.toString());

  // Send the email
  const sent = await email.sendTemplated({
    to: { emailAddress },
    type: "login",
    arguments: {
      oneTimeCode: login.code,
      magicLink: magicLink.toString(),
    },
  });

  if (!sent) {
    throw HTTPError.internalServerError("login email failed");
  }
}

function assertRedirect(uri: string, conference: ConferenceRecord | null) {
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
  },
  async handler({ request, authz, store, random, email, appConfig, repo }) {
    // NOTE: it previously short-circuited the login if there was an active session
    // this cased confusion so was taken out

    const body = await assertRequestBody(LoginBody, request);
    const emailAddress = trimEmail(body.emailAddress);

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

    if (body.emailAddress) {
      // Send the email login, throwing if it fails
      await _startEmailLogin(
        store,
        email,
        login,
        emailAddress,
        appConfig.auth.loginMaxAge,
      );

      // Set the login cookie on the client
      const headers = new Headers();
      headers.set(
        "Set-Cookie",
        cookie.serialize(appConfig.auth.loginCookie, login.token, {
          httpOnly: true,
          maxAge: appConfig.auth.loginMaxAge / 1_000,
          secure: appConfig.server.url.protocol === "https:",
        }),
      );

      // NOTE: just-cookies doesn't work on safari,
      // maybe an oauth2 flow would be better in the futures
      return Response.json({ token: login.token }, { headers });
    }

    throw HTTPError.notImplemented();
  },
});
