import Vue from 'vue'
import VueI18n from 'vue-i18n'
import { setProperty } from 'dot-prop'

import en from './en.yml'
import { appConfig } from './config.js'

Vue.use(VueI18n)

const messages = { en }

// Merge config.json messages into the en.yml
for (const [key, value] of Object.entries(appConfig.i18n)) {
  for (const [locale, string] of Object.entries(value)) {
    setProperty(messages, `${locale}.${key}`, string)
  }
}

export const i18n = new VueI18n({ locale: 'en', messages })
