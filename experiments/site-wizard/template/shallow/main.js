import Vue from "vue";

import App from "./App.vue";
import { router } from "./router.js";
import { store } from "./store.js";
import { i18n } from "./i18n.js";

import { env } from "./config.js";

import {
  DevPlugin,
  DialogPlugin,
  TemporalPlugin,
} from "@openlab/deconf-ui-toolkit";

import {
  EnvPlugin,
  FontawesomePlugin,
  GenericDeconfPlugin,
  MetricsPlugin,
  SocketIoPlugin,
} from "./plugins.js";

if (!env.DISABLE_SOCKETS) Vue.use(SocketIoPlugin);

Vue.use(TemporalPlugin, 1000);
Vue.use(DevPlugin);
Vue.use(EnvPlugin);
Vue.use(FontawesomePlugin);
Vue.use(MetricsPlugin);
Vue.use(GenericDeconfPlugin);
Vue.use(DialogPlugin);

console.log(App);

new Vue({
  router,
  store,
  i18n,
  render: (h) => h(App),
}).$mount("#app");
