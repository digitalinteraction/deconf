import Vue from "vue";
import Vuex from "vuex";

import { appConfig, env } from "./config.js";
import {
  createMetricsStoreModule,
  DeconfApiClient,
  createApiStoreModule,
  createApiStoreActions,
} from "@openlab/deconf-ui-toolkit";

// ...

Vue.use(Vuex);

function patch(object, key, fn) {
  const oldValue = object[key];
  object[key] = fn(oldValue);
}

function apiModule() {
  const apiClient = new DeconfApiClient(env.SERVER_URL);

  // TODO: a better way of doing this
  patch(apiClient, "getSchedule", (fn) => {
    return async (...args) => {
      const schedule = await fn.bind(apiClient)(...args);
      for (const speaker of schedule.speakers) {
        speaker.headshot = speaker.headshot ?? appConfig.site.defaultHeadshot;
      }
      return schedule;
    };
  });

  return {
    ...createApiStoreModule(),
    getters: {
      apiClient: () => apiClient,
    },
    actions: {
      ...createApiStoreActions(apiClient),
      authenticate() {
        // TODO: ...
      },
      unauthenticate() {
        // TODO: ...
      },
    },
  };
}

function metricsModule() {
  return {
    ...createMetricsStoreModule(),
  };
}

export const store = new Vuex.Store({
  modules: {
    api: apiModule(),
    metrics: metricsModule(),
  },
});
