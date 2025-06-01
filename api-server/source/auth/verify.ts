import { assertRequestBody, defineRoute, HTTPError, Structure } from "gruber";
import cookie from "cookie";

import { commponDependencies } from "../lib/globals.ts";
import { AuthRepo } from "./auth-repo.ts";
import { LoginRequest } from "./login.ts";

const VerifyBody = Structure.union([
  Structure.object({
    method: Structure.literal("email"),
    token: Structure.string(),
    code: Structure.string(),
  }),
]);

export const verifyRoute = defineRoute({
  method: "POST",
  pathname: "/auth/v1/verify",
  dependencies: {
    ...commponDependencies,
    repo: AuthRepo.use,
  },
  async handler({ request, store, repo, tokens, appConfig }) {
    const body = await assertRequestBody(VerifyBody, request);

    const login = await store.get<LoginRequest>(`/auth/request/${body.token}`);
    if (!login) throw HTTPError.badRequest();

    if (login.method === "email") {
      if (login.code !== parseInt(body.code)) {
        throw HTTPError.unauthorized();
      }

      const user = await repo.getUserByEmail(login.payload.emailAddress);
      if (!user) {
        // login.uses -= 1;
        // if (login.uses <= 0) await store.delete(`/auth/request/${body.token}`);
        // else store.set(`/auth/request/${body.token}`, login);

        throw HTTPError.notImplemented("TODO: user auto-create system?");
      }

      const token = await tokens.sign("user", {
        maxAge: appConfig.auth.sessionMaxAge,
        userId: user.id,
      });

      const headers = new Headers();
      headers.set(
        "Set-Cookie",
        cookie.serialize(appConfig.auth.cookieName, token, {
          httpOnly: true,
          maxAge: appConfig.auth.sessionMaxAge / 1_000,
        }),
      );

      await store.delete(`/auth/request/${body.token}`);

      return new Response("ok", { headers });
    }

    throw HTTPError.notImplemented();

    // const user = await repo.getUserByEmail(login.)
  },
});
