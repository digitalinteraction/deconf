import { defineRoute } from "gruber";
import { useAuthz } from "../lib/globals.ts";

export const replaceRegistrationsRoute = defineRoute({
  method: "PUT",
  pathname: "/admin/v1/conference/:conference/registrations",
  dependencies: {
    authz: useAuthz,
  },
  async handler({ request, authz, params }) {
    await authz.assert(request, { scope: "admin" });

    // ...

    return new Response("ok");
  },
});
