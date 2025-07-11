import { assertRequestBody, defineRoute, HTTPError, Structure } from "gruber";
import cookie from "cookie";

import { commponDependencies, undefinedStructure } from "../lib/mod.ts";
import { AuthRepo } from "./auth-repo.ts";
import { LoginRequest } from "./login.ts";

const VerifyBody = Structure.union([
  Structure.object({
    method: Structure.literal("email"),
    token: Structure.union([undefinedStructure(), Structure.string()]),
    code: Structure.number(),
  }),
]);

function getLoginToken(request: Request, cookieName: string) {
  const value = request.headers.get("Cookie");
  if (!value) return undefined;

  return cookie.parse(value)[cookieName];
}

// TODO: clear deconf_login cookie

export const verifyRoute = defineRoute({
  method: "POST",
  pathname: "/auth/v1/verify",
  dependencies: {
    ...commponDependencies,
    repo: AuthRepo.use,
  },
  async handler({ request, store, repo, tokens, appConfig }) {
    const body = await assertRequestBody(VerifyBody, request);

    const loginToken =
      body.token ?? getLoginToken(request, appConfig.auth.loginCookie);

    if (!loginToken) throw HTTPError.badRequest("no token");

    const login = await store.get<LoginRequest>(`/auth/request/${loginToken}`);
    if (!login) throw HTTPError.badRequest();

    if (login.method === "email") {
      if (login.code !== body.code) {
        throw HTTPError.unauthorized();
      }

      const user = await repo.getUserByEmail(login.payload.emailAddress);
      if (!user) {
        // login.uses -= 1;
        // if (login.uses <= 0) await store.delete(`/auth/request/${loginToken}`);
        // else store.set(`/auth/request/${loginToken}`, login);

        throw HTTPError.notImplemented("TODO: user auto-create system?");
      }

      // TODO: this is a hack for now, should be based on Conference roles
      const scope = user.metadata.admin ? "admin" : "user";

      const sessionToken = await tokens.sign(scope, {
        maxAge: appConfig.auth.sessionMaxAge,
        userId: user.id,
      });

      const headers = new Headers();
      headers.append(
        "Set-Cookie",
        cookie.serialize(appConfig.auth.sessionCookie, sessionToken, {
          httpOnly: true,
          maxAge: appConfig.auth.sessionMaxAge / 1_000,
        }),
      );
      headers.append(
        "Set-Cookie",
        cookie.serialize(appConfig.auth.loginCookie, "", {
          expires: new Date(0),
        }),
      );

      await store.delete(`/auth/request/${loginToken}`);

      // return new Response("ok", { headers });
      return Response.json({ token: sessionToken }, { headers });
    }

    throw HTTPError.notImplemented();

    // const user = await repo.getUserByEmail(login.)
  },
});
