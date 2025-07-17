import { defineRoute, HTTPError, Structure } from "gruber";
import cookie from "cookie";

import { assertRequestBody } from "gruber/http/request-body.js";
import { commponDependencies } from "../lib/globals.ts";
import { emailStructure, trimEmail } from "../lib/mod.ts";

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

export const loginRoute = defineRoute({
  method: "POST",
  pathname: "/auth/v1/login",
  dependencies: {
    ...commponDependencies,
  },
  async handler({ request, authz, store, random, email, appConfig }) {
    const auth = await authz.from(request);

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

    // TODO: validate redirect_uri

    // const paddedCode = login.code.toString().padStart(6, "0");

    if (body.emailAddress) {
      store.set<LoginRequest>(
        `/auth/request/${login.token}`,
        {
          ...login,
          method: "email",
          payload: { emailAddress },
        },
        { maxAge: appConfig.auth.loginMaxAge },
      );

      // const verify = new URL("./auth/v1/verify", appConfig.server.url);
      const callback = new URL(body.redirectUri);
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

      const headers = new Headers();
      headers.set(
        "Set-Cookie",
        cookie.serialize(appConfig.auth.loginCookie, login.token, {
          httpOnly: true,
          maxAge: appConfig.auth.loginMaxAge / 1_000,
          secure: appConfig.server.url.protocol === "https:",
        }),
      );

      return new Response(undefined, { headers });
    }

    throw HTTPError.notImplemented();
  },
});
