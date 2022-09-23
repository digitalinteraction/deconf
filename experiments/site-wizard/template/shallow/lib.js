import { i18n } from "./i18n.js";
import { appConfig } from "./config.js";
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

export function guardPage(page, user, router) {
  if (user?.user_roles.includes("admin") || page.access === "public") return;
  router.replace({ name: Routes.NotFound });
}

// TODO: customise more with data ...
export function scheduleOptions(page, data) {
  const filters = [...data.primaryFilters, ...data.secondaryFilters]
    .filter((f) => f.type === "builtin")
    .map((f) => f.builtin);

  return {
    predicate(session) {
      return true;
      // return !trackBlockList.has(session.track)
    },
    filtersKey: `schedule_${page.id}_filters`,
    scheduleConfig: {
      tileHeader: ["type"],
      tileAttributes: ["track", "themes"],
    },
    enabledFilters: filters,
    languages: appConfig.languages.available.map((l) => ({
      value: l.key,
      text: l.name,
    })),
  };
}
