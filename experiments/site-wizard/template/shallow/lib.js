import { i18n } from './i18n.js'
import { appConfig } from './config.js'
import { localiseFromObject, Routes } from '@openlab/deconf-ui-toolkit'

export const homeRoute = { name: Routes.Atrium }
export const authTokenKey = 'authToken'

export function setLocale(newLocale) {
  i18n.locale = newLocale
}

export function localise(object) {
  return localiseFromObject(i18n.locale, object)
}

export { navIcons, FontawesomePlugin } from './icons.js'
export { appConfig, env } from './config.js'

export function assetUrl(input) {
  return '/' + input
}

export function guardPage(page, user, router) {
  if (user?.user_roles.includes('admin') || page.access === 'public') return
  router.replace({ name: Routes.NotFound })
}

// TODO: customise more with data ...
export function scheduleOptions(page, data) {
  const filterNames = {
    search: 'query',
    date: 'date',
    language: 'language',
  }

  const filters = [...data.primaryFilters, ...data.secondaryFilters]
    .filter((f) => f.type === 'builtin')
    .map((f) => filterNames[f.builtin])
    .filter((f) => f)

  return {
    predicate(session) {
      return true
    },
    filtersKey: `schedule_${page.id}_filters`,
    scheduleConfig: {
      tileHeader: ['type'],
      tileAttributes: ['track', 'themes'],
      getSessionRoute(session) {
        // TODO: BUG: only works on titles
        const params = { sessionId: session.id }
        return { name: page.id + '-session', params }
      },
    },
    enabledFilters: filters,
    languages: appConfig.languages.available.map((l) => ({
      value: l.key,
      text: l.name,
    })),
  }
}
