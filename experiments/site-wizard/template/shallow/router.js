import Vue from "vue";
import VueRouter from "vue-router";
import { Routes } from "@openlab/deconf-ui-toolkit";

// import i18n from '../i18n.js'
import { views } from "./views.js";
import { appConfig } from "./config.js";

const routes = [{ path: "/", redirect: { name: "home" }, name: Routes.Atrium }];

const sessionPages = new Set(["sessionTimeline", "sessionGrid", "home"]);

for (const page of appConfig.pages) {
  routes.push({
    path: "/" + page.id,
    name: page.id,
    component: views[page.version][page.type](page),
    meta: {
      // TODO: put meta somewhere inside config.json
    },
  });

  if (sessionPages.has(page.type)) {
    routes.push({
      path: `/${page.id}/:sessionId`,
      props: true,
      name: page.id + "-session",
      component: views.v0.session(page),
    });
  }
}

routes.push({
  path: "/_token",
  name: Routes.TokenCapture,
  component: views.v0.tokenCapture(),
});
routes.push({
  path: "/login",
  name: Routes.Login,
  component: views.v0.login(),
});
routes.push({
  path: "/register",
  name: Routes.Register,
  component: views.v0.register(),
});
routes.push({
  path: "/profile",
  name: Routes.Profile,
  component: views.v0.profile(),
});
routes.push({
  path: "/error/:code",
  component: views.v0.error(),
  props: true,
});
routes.push({
  path: "/error",
  component: views.v0.error(),
});
routes.push({
  path: "/not-found",
  component: views.v0.notFound(),
});
routes.push({
  path: "*",
  component: views.v0.notFound(),
});

// TODO: scroll offset stuff and document.title setting

Vue.use(VueRouter);

export const router = new VueRouter({ mode: "history", routes });
