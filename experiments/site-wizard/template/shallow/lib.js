import { i18n } from "./i18n.js";
import { localiseFromObject, Routes } from "@openlab/deconf-ui-toolkit";

export const homeRoute = { name: Routes.Atrium };

export function setLocale(newLocale) {
  // ...
}

export function localise(object) {
  return localiseFromObject(i18n.locale, object);
}

export { navIcons, FontawesomePlugin } from "./icons.js";
export { appConfig, env } from "./config.js";

export function assetUrl(input) {
  return "/" + input;
}
