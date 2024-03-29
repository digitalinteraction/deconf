/* eslint-disable vue/one-component-per-file */

import Vue from 'vue'

import AppLayout from './components/AppLayout.vue'
import UtilLayout from './components/UtilLayout.vue'

function viewify(mod, props = {}) {
  return Vue.extend({
    name: 'DeconfInjectedView',
    render(h) {
      return h(mod.default, {
        props: { ...props, ...this.$attrs },
      })
    },
  })
}
function fakeView(text, layout = AppLayout) {
  return Vue.extend({
    render: (h) => h(layout, [h('p', text)]),
  })
}

function homeV0(page) {
  const props = { page }
  return async () => viewify(await import('./v0/Home.vue'), props)
}
function sessionTimelineV0(page) {
  const props = { page }
  return async () => viewify(await import('./v0/SessionTimeline.vue'), props)
}
function sessionGridV0(page) {
  const props = { page }
  return async () => viewify(await import('./v0/SessionGrid.vue'), props)
}
function sessionV0(page) {
  const props = { page }
  return async () => viewify(await import('./v0/Session.vue'), props)
}
function myScheduleV0(page) {
  return async () => fakeView('mySchedule')
}
function contentV0(page) {
  const props = { content: page.content.body }
  return async () => viewify(await import('./v0/Content.vue'), props)
}
function tokenCaptureV0() {
  return async () => viewify(await import('./v0/TokenCapture.vue'))
}
function loginV0() {
  return async () => viewify(await import('./v0/Login.vue'))
}
function registerV0() {
  return async () => viewify(await import('./v0/Register.vue'))
}
function profileV0() {
  return async () => viewify(await import('./v0/Profile.vue'))
}
function errorV0() {
  return async () => fakeView('error', UtilLayout)
}
function notFoundV0() {
  return async () => fakeView('notFound', UtilLayout)
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
}
