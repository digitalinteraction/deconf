import { defineRoute } from "gruber";
import { useAuthz } from "../lib/globals.ts";
import { WebPushRepo } from "../notifications/web-push-repo.ts";

export const getWebPushInfo = defineRoute({
  method: "GET",
  pathname: "/admin/v1/conference/:conference/web-push",
  dependencies: {
    authz: useAuthz,
    webPush: WebPushRepo.use,
  },
  async handler({ request, params, webPush, authz }) {
    const { userId } = await authz.assertUser(request, {
      scope: "admin",
    });

    const { conference } = await webPush.assertRegistered(
      params.conference,
      userId,
    );

    return Response.json(await webPush.getInfo(conference.id));
  },
});
