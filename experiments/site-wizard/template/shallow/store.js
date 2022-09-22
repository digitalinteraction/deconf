import Vue from "vue";
import Vuex from "vuex";

import { env } from "./config.js";
import {
  createMetricsStoreModule,
  DeconfApiClient,
  createApiStoreModule,
  createApiStoreActions,
} from "@openlab/deconf-ui-toolkit";

// ...

Vue.use(Vuex);

function apiModule() {
  const apiClient = new DeconfApiClient(env.SERVER_URL.href);

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
