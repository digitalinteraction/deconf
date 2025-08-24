import { defineRoute } from "gruber";

import { useAuthz, useDatabase } from "../lib/mod.ts";
import { _assertConferenceData } from "./admin-lib.ts";

export const getConferenceRoute = defineRoute({
  method: "GET",
  pathname: "/admin/v1/conferences/:conference/schedule",
  dependencies: {
    authz: useAuthz,
    sql: useDatabase,
  },
  async handler({ request, authz, sql, params }) {
    await authz.assert(request, { scope: "admin" });

    return Response.json(await _assertConferenceData(sql, params.conference));
  },
});
