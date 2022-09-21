import Vue from "vue";
import VueRouter from "vue-router";

// import i18n from '../i18n.js'
import { views } from "./views.js";
import { appConfig } from "./config.js";

Vue.use(VueRouter);

const routes = [{ path: "/", redirect: { name: "/home" } }];

for (const page of appConfig.pages) {
  // TODO: add nested pages too ...

  routes.push({
    path: "/" + page.id,
    name: page.id,
    component: views[page.version][page.type](page, appConfig),
    meta: {
      // TODO: put meta somewhere inside config.json
    },
  });
}

routes.push({
  path: "/_token",
  component: views.v0.tokenCapture(appConfig),
});
routes.push({
  path: "/login",
  component: views.v0.login(appConfig),
});
routes.push({
  path: "/register",
  component: views.v0.register(appConfig),
});
routes.push({
  path: "/profile",
  component: views.v0.profile(appConfig),
});
routes.push({
  path: "/error/:code",
  component: views.v0.error(appConfig),
  props: true,
});
routes.push({
  path: "/error",
  component: views.v0.error(appConfig),
});
routes.push({
  path: "/not-found",
  component: views.v0.notFound(appConfig),
});
routes.push({
  path: "*",
  component: views.v0.notFound(appConfig),
});

console.log(routes);

// TODO: scroll offset stuff and document.title setting

export const router = new VueRouter({ mode: "history", routes });
