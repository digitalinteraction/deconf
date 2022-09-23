/* eslint-disable vue/one-component-per-file */

import Vue from "vue";

import AppLayout from "./components/AppLayout.vue";

function viewify(mod, props = {}) {
  return Vue.extend({
    name: "DeconfInjectedView",
    render: (h) => h(mod.default, { props }),
  });
}

// TODO: generators for views

function homeV0(page) {
  const props = { page };
  return async () => viewify(await import("./v0/Home.vue"), props);
}
function sessionTimelineV0(page) {
  return Vue.extend({
    render: (h) => h(AppLayout, [h("p", "sessionTimeline")]),
  });
}
function sessionGridV0(page) {
  return Vue.extend({
    render: (h) => h(AppLayout, [h("p", "sessionGrid")]),
  });
}
function sessionV0(page) {
  return Vue.extend({
    props: { sessionId: String, required: true },
    render(h) {
      return h(AppLayout, [h("p", `session id=${this.sessionId}`)]);
    },
  });
}
function myScheduleV0(page) {
  return Vue.extend({
    render: (h) => h(AppLayout, [h("p", "mySchedule")]),
  });
}
function contentV0(page) {
  const props = { content: page.content.body };
  return async () => viewify(await import("./v0/Content.vue"), props);
}
function tokenCaptureV0() {
  return Vue.extend({
    render: (h) => h(AppLayout, [h("p", "tokenCapture")]),
  });
}
function loginV0() {
  return async () => viewify(await import("./v0/Login.vue"));
}
function registerV0() {
  return Vue.extend({
    render: (h) => h(AppLayout, [h("p", "register")]),
  });
}
function profileV0() {
  return Vue.extend({
    render: (h) => h(AppLayout, [h("p", "profile")]),
  });
}
function errorV0() {
  return Vue.extend({
    render: (h) => h(AppLayout, [h("p", "error")]),
  });
}
function notFoundV0() {
  return Vue.extend({
    render: (h) => h(AppLayout, [h("p", "notFound")]),
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
