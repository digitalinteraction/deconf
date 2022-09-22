/* eslint-disable vue/one-component-per-file */

import Vue from "vue";

import GenericAppLayout from "./components/GenericAppLayout.vue";

function viewify(mod, props) {
  return Vue.extend({
    name: "DeconfInjectedView",
    render: (h) => h(mod.default, { props }),
  });
}

// TODO: generators for views

function homeV0(page, appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "home")]),
  });
}
function sessionTimelineV0(page, appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "sessionTimeline")]),
  });
}
function sessionGridV0(page, appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "sessionGrid")]),
  });
}
function sessionV0(page, appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "session")]),
  });
}
function myScheduleV0(page, appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "mySchedule")]),
  });
}
function contentV0(page, appConfig) {
  return async () =>
    viewify(await import("./v0/Content.vue"), { content: page.content.body });
}
function tokenCaptureV0(appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "tokenCapture")]),
  });
}
function loginV0(appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "login")]),
  });
}
function registerV0(appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "register")]),
  });
}
function profileV0(appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "profile")]),
  });
}
function errorV0(appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "error")]),
  });
}
function notFoundV0(appConfig) {
  return Vue.extend({
    render: (h) => h(GenericAppLayout, [h("p", "notFound")]),
  });
}

export const views = {
  v0: {
    home: homeV0,
    sessionTimeline: sessionTimelineV0,
    sessionGrid: sessionGridV0,
    mySchedule: myScheduleV0,
    session: sessionV0,
    content: contentV0,
    tokenCapture: tokenCaptureV0,
    login: loginV0,
    register: registerV0,
    profile: profileV0,
    error: errorV0,
    notFound: notFoundV0,
  },
};
