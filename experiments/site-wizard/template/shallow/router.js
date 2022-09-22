import Vue from "vue";
import VueRouter from "vue-router";
import { Routes } from "@openlab/deconf-ui-toolkit";

// import i18n from '../i18n.js'
import { views } from "./views.js";
import { appConfig } from "./config.js";

const routes = [{ path: "/", redirect: { name: "home" }, name: Routes.Atrium }];

for (const page of appConfig.pages) {
  routes.push({
    path: "/" + page.id,
    name: page.id,
    component: views[page.version][page.type](page, appConfig),
    meta: {}, // TODO: put meta somewhere inside config.json
  });

  // TODO: add nested pages too ...
  // if (page.type === "sessionTimeline") {
  //   routes.push({
  //     path: `/${page.id}/:sessionId`,
  //     props: true,
  //     name: page.id + "-session",
  //     // TODO: do nested pages need their own config from parent "page"?
  //     component: views.v0.session(page, appConfig),
  //   });
  // }
}

// TODO: a default "session" page too

routes.push({
  path: "/_token",
  name: Routes.TokenCapture,
  component: views.v0.tokenCapture(appConfig),
});
routes.push({
  path: "/login",
  name: Routes.Login,
  component: views.v0.login(appConfig),
});
routes.push({
  path: "/register",
  name: Routes.Register,
  component: views.v0.register(appConfig),
});
routes.push({
  path: "/profile",
  name: Routes.Profile,
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

// TODO: scroll offset stuff and document.title setting

Vue.use(VueRouter);

export const router = new VueRouter({ mode: "history", routes });
