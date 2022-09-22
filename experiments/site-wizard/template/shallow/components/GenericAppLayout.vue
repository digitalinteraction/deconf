<template>
  <AppLayout
    :app-settings="{}"
    :user="user"
    :routes="routes"
    :nav-links="navLinks"
  >
    <BrandAsset slot="brandA" :image="appConfig.branding.primary" />
    <BrandAsset slot="brandB" :image="appConfig.branding.secondary" />
    <router-link slot="brandC" :to="homeRoute">
      <BrandAsset :image="appConfig.branding.tabs" />
    </router-link>
    <div slot="main" class="appLayout-fill">
      <slot />
      <PageFooter />
    </div>
  </AppLayout>
</template>

<script>
/* eslint-disable vue/one-component-per-file */
import Vue from "vue";
import { AppLayout, mapApiState } from "@openlab/deconf-ui-toolkit";

import { appConfig, homeRoute, localise, navIcons } from "../lib.js";

import BrandAsset from "./BrandAsset.vue";
import PageFooter from "./PageFooter.vue";

export default Vue.extend({
  components: { AppLayout, BrandAsset, PageFooter },
  data() {
    return { homeRoute, appConfig };
  },
  computed: {
    ...mapApiState("api", ["schedule", "user"]),
    navLinks() {
      const links = [];
      if (appConfig.site.login.enabled) links.push("login");
      if (appConfig.site.register.enabled) links.push("register");
      if (appConfig.site.profile.enabled) links.push("profile");
      return links;
    },
    routes() {
      return appConfig.navigation.map((item) => ({
        title: localise(item.text),
        name: item.page,
        icon: Vue.extend({
          render: (h) =>
            h("div", { domProps: { innerHTML: navIcons[item.icon] } }),
        }),
        enabled: true,
      }));
    },
  },
});
</script>

<style lang="scss">
.appLayout-fill {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
}
.appLayout-fill > :not(.pageFooter) {
  flex: 1;
}
</style>
