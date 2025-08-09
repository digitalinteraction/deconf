import { defineRoute, HTTPError, Store, Structure } from "gruber";
import cookie from "cookie";

import { assertRequestBody } from "gruber/http/request-body.js";
import { commponDependencies } from "../lib/globals.ts";
import { EmailService, emailStructure, trimEmail } from "../lib/mod.ts";

const LoginBody = Structure.union([
  Structure.object({
    emailAddress: emailStructure(),
    redirectUri: Structure.string(),
  }),
]);

export interface LoginRequest {
  token: string;
  payload: {
    emailAddress: string;
  };
  code: number;
  method: "email";
  redirectUri: string;
  uses: number;
}

// This is exported so that it can be used in the tito webhook too
export async function _startEmailLogin(
  store: Store,
  email: EmailService,
  login: Omit<LoginRequest, "method" | "payload">,
  emailAddress: string,
  conferenceId: number,
  maxAge: number,
) {
  store.set<LoginRequest>(
    `/auth/request/${login.token}`,
    {
      ...login,
      method: "email",
      payload: { emailAddress },
    },
    { maxAge },
  );

  // const verify = new URL("./auth/v1/verify", appConfig.server.url);
  const callback = new URL(login.redirectUri);
  callback.searchParams.set("method", "email");
  callback.searchParams.set("token", login.token);

  const magicLink = new URL(callback);
  magicLink.searchParams.set("code", login.code.toString());

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

export const loginRoute = defineRoute({
  method: "POST",
  pathname: "/auth/v1/login",
  dependencies: {
    ...commponDependencies,
  },
  async handler({ request, authz, store, random, email, appConfig }) {
    // const auth = await authz.from(request);

    // if (auth?.kind === "user") {
    //   return new Response("already authenticated");
    // }

    const body = await assertRequestBody(LoginBody, request);
    const emailAddress = trimEmail(body.emailAddress);

    const login = {
      token: random.uuid(),
      code: random.number(0, 999_999),
      redirectUri: body.redirectUri,
      uses: 5,
    };

    // TODO: validate redirect_uri ~ maybe based on the ConfRecord#metadata.redirects

    if (body.emailAddress) {
      await _startEmailLogin(
        store,
        email,
        login,
        emailAddress,
        -1, // TODO: this needs to be set (see todo above)
        appConfig.auth.loginMaxAge,
      );

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
