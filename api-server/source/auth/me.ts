import { defineRoute, HTTPError } from "gruber";
import { useAuthz } from "../lib/mod.ts";
import { AuthRepo } from "./auth-repo.ts";

export const getAuthRoute = defineRoute({
  method: "GET",
  pathname: "/auth/v1/me",
  dependencies: {
    authz: useAuthz,
    repo: AuthRepo.use,
  },
  async handler({ request, authz, repo }) {
    // See if the requester has sent authorization
    const result = await authz.from(request);
    if (!result) throw HTTPError.unauthorized();

    // Generate a response from the authz
    const output: any = {
      kind: result.kind,
      scope: result.scope,
    };

    // If they are also a user, fetch the user & registration records too
    if (result.kind === "user") {
      const user = await repo.getUser(result.userId);
      const registrations = await repo.listRegistrations(result.userId);

      if (user?.metadata.blocked) throw HTTPError.unauthorized();

      Object.assign(output, { user, registrations });
    }

    return Response.json(output);
  },
});
