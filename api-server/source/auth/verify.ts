import cookie from "cookie";
import { assertRequestBody, defineRoute, HTTPError, Structure } from "gruber";

import { commponDependencies, undefinedStructure } from "../lib/mod.ts";
import { AuthLib, LoginRequest } from "./auth-lib.ts";
import { AuthRepo } from "./auth-repo.ts";

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

export const verifyRoute = defineRoute({
  method: "POST",
  pathname: "/auth/v1/verify",
  dependencies: {
    ...commponDependencies,
    repo: AuthRepo.use,
    lib: AuthLib.use,
  },
  async handler({ request, store, repo, lib, appConfig }) {
    const body = await assertRequestBody(VerifyBody, request);

    // Get the login token from the request body or from the cookies
    const loginToken =
      body.token ?? getLoginToken(request, appConfig.auth.loginCookie);

    if (!loginToken) throw HTTPError.badRequest("no token");

    // Get the login itself from the store
    const login = await store.get<LoginRequest>(`/auth/request/${loginToken}`);
    if (!login) throw HTTPError.badRequest();

    if (login.method === "email") {
      // Ensure they have the code correct
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
      const { headers, sessionToken } = await lib.finish(login, user.id, scope);

      return Response.json({ token: sessionToken }, { headers });
    }

    throw HTTPError.notImplemented();
  },
});
