<template>
  <div id="app">
    <ApiError v-if="apiState === 'error'" :home-route="homeRoute">
      <BrandAsset slot="brand" :image="appConfig.branding.primary" />
      <PageFooter slot="footer" />
    </ApiError>
    <router-view v-else-if="apiState === 'ready'" />
    <AppLoading v-else />

    <DevControl
      :dev-plugin="$dev"
      :force-enabled="forceDev"
      :controls="['scheduleDate']"
    />
    <AppDialog :dialog-plugin="$dialog" />
  </div>
</template>

<script>
import Vue from "vue";
import {
  ApiError,
  AppDialog,
  AppLoading,
  DevControl,
  mapApiState,
} from "@openlab/deconf-ui-toolkit";
import { appConfig, homeRoute, setLocale } from "./lib.js";
import BrandAsset from "./components/BrandAsset.vue";
import PageFooter from "./components/PageFooter.vue";

export default Vue.extend({
  components: {
    ApiError,
    AppDialog,
    AppLoading,
    BrandAsset,
    DevControl,
    PageFooter,
  },
  data() {
    return { appConfig, homeRoute };
  },
  computed: {
    ...mapApiState("api", ["apiState", "schedule", "user"]),
    forceDev() {
      return process.env.NODE_ENV === "development";
    },
  },
  mounted() {
    this.fetchData();
    this.$temporal.setup();
    // TODO: socket.io
    // TODO: re-fetch data periodically
  },
  destroyed() {
    this.$temporal.teardown();
    this.$io?.teardown();
  },
  methods: {
    async fetchData() {
      const token = localStorage.getItem("authToken");
      if (token) {
        await this.$store.dispatch("api/authenticate", { token });
        if (this.user) setLocale(this.user.user_lang);
        else localStorage.removeItem("authToken");
      }
      if (!this.user) {
        await this.$store.dispatch("api/fetchData");
        if (typeof this.$route.query.locale === "string") {
          setLocale(this.$route.query.locale);
        }
      }
    },
  },
});
</script>

<style lang="scss">
@import "@openlab/deconf-ui-toolkit/theme.scss";
@import "@fortawesome/fontawesome-svg-core/styles.css";
// @import "@/scss/hacks.scss";
// @import "@/scss/globals.scss";
</style>
