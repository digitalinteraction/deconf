import { OAuth2Client } from "google-auth-library";
import { loader } from "gruber";
import { useAppConfig } from "./globals.ts";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export const useGoogleClient = loader(() => {
  const appConfig = useAppConfig();
  return new OAuth2Client(
    appConfig.google.oauth2.clientId,
    appConfig.google.oauth2.clientSecret,
    new URL("./auth/v1/verify", appConfig.server.url).toString(),
  );
});
