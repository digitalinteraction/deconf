import { defineRoute } from "gruber";
import { useAuthz } from "../lib/globals.ts";

export const replaceScheduleRoute = defineRoute({
  method: "PUT",
  pathname: "/admin/v1/conference/:conference/schedule",
  dependencies: {
    authz: useAuthz,
  },
  async handler({ request, authz, params }) {
    await authz.assert(request, { scope: "admin" });

    // ...

    return new Response("ok");
  },
});
