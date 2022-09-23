import Vue from "vue";
import Vuex from "vuex";

import { appConfig, env } from "./config.js";
import { authTokenKey, setLocale } from "./lib.js";
import {
  createMetricsStoreModule,
  DeconfApiClient,
  createApiStoreModule,
  createApiStoreActions,
  decodeJwt,
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
      async authenticate({ commit, dispatch }, { token }) {
        const user = decodeJwt(token);

        // TODO: centralise this

        if (user.iss !== env.JWT_ISSUER) {
          console.error("JWT signed by unknown issuer %o", user.iss);
          commit("user", null);
          return;
        }

        commit("user", user);
        setLocale(user.user_lang);

        apiClient.setAuthToken(token);
        // TODO: SocketIoPlugin.authenticate(token)

        await dispatch("fetchData");
        await dispatch("fetchUserAttendance");
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
