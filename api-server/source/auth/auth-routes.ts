import { loginRoute } from "./login.ts";
import { getAuthRoute } from "./me.ts";
import { oauthRoute } from "./oauth.ts";
import { verifyRoute } from "./verify.ts";

export const authRoutes = [loginRoute, verifyRoute, getAuthRoute, oauthRoute];
